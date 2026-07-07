"""Chemistry validators for the ChemScene engine (SUBJECTS.md §5 — chemistry).

Pure-stdlib, deterministic, additive. These are the gateway-side gates that verify an
authored ``chemScene`` card spec before it can ever reach a learner. Three crisp checks,
exactly the ones SUBJECTS.md names for chemistry ("RDKit, balance checker, stoichiometry"):

- **balance checker** — element conservation is pure arithmetic. An authored equation whose
  stated coefficients do not conserve every element on both sides is refused. Deterministic;
  no model, no CAS needed.
- **stoichiometry** — molar mass per species from a built-in atomic-weight table, so a
  balance spec ships with computed molar masses (the client can show mole↔mass without
  recomputing, and an unknown element is surfaced honestly rather than guessed).
- **SMILES validity** — RDKit is deliberately NOT added to the gateway: the python RDKit
  wheel is a heavy C++ dependency that would bloat the image and slow CI, and it is not
  needed server-side (RDKit-js does the true 2D structural render in the learner's browser).
  Instead this module ships a pure-python SMILES **syntax + coarse-valence** validator:
  bracket/ring-closure balance, known element tokens, and a per-atom bond tally checked
  against common valence maxima for the organic subset. Honest about its ceiling — it proves
  a SMILES string is well-formed and not grossly over-valent, not that the molecule is real
  or that its stereochemistry/aromaticity is sound. The client's RDKit render is the arbiter
  of drawability; this gate only refuses obvious garbage before it is cached.

Everything here is a plain function over plain data so ``python chem.py`` runs the self-check
at the bottom (ponytail: one runnable assert block, no framework).
"""

from __future__ import annotations

import re

# --- atomic data (common Z=1..56 + a few heavier ones a K-12 course actually uses) --------
# Standard atomic weights (IUPAC, 4 s.f. is plenty for stoichiometry display). Only what a
# school syllabus touches — an element outside this table makes molar mass unknown (surfaced),
# never fabricated. Element-symbol membership here is also the SMILES/formula token whitelist.
ATOMIC_WEIGHT: dict[str, float] = {
    "H": 1.008, "He": 4.003, "Li": 6.94, "Be": 9.012, "B": 10.81, "C": 12.011,
    "N": 14.007, "O": 15.999, "F": 18.998, "Ne": 20.180, "Na": 22.990, "Mg": 24.305,
    "Al": 26.982, "Si": 28.085, "P": 30.974, "S": 32.06, "Cl": 35.45, "Ar": 39.948,
    "K": 39.098, "Ca": 40.078, "Sc": 44.956, "Ti": 47.867, "V": 50.942, "Cr": 51.996,
    "Mn": 54.938, "Fe": 55.845, "Co": 58.933, "Ni": 58.693, "Cu": 63.546, "Zn": 65.38,
    "Ga": 69.723, "Ge": 72.630, "As": 74.922, "Se": 78.971, "Br": 79.904, "Kr": 83.798,
    "Rb": 85.468, "Sr": 87.62, "Y": 88.906, "Zr": 91.224, "Ag": 107.868, "Cd": 112.414,
    "Sn": 118.710, "Sb": 121.760, "I": 126.904, "Xe": 131.293, "Ba": 137.327,
    "Pt": 195.084, "Au": 196.967, "Hg": 200.592, "Pb": 207.2,
}

# Common maximum valence for the SMILES organic subset (coarse — catches gross over-bonding).
_MAX_VALENCE: dict[str, int] = {
    "B": 3, "C": 4, "N": 4, "O": 2, "P": 5, "S": 6,
    "F": 1, "Cl": 1, "Br": 1, "I": 1, "H": 1,
}
# Atoms writable bare (no brackets) in SMILES — the organic subset.
_ORGANIC_SUBSET = {"B", "C", "N", "O", "P", "S", "F", "Cl", "Br", "I"}

_TOKEN_RE = re.compile(r"[A-Z][a-z]?|\d+|[()\[\]]")


# --- formula parsing (element counts, with nested groups) ---------------------------------


def parse_formula(formula: str) -> dict[str, int] | None:
    """Element counts for a chemical formula, e.g. ``Ca(OH)2`` -> ``{'Ca':1,'O':2,'H':2}``.

    Handles nested ``()`` / ``[]`` groups with integer multipliers and a leading coefficient
    is NOT accepted here (coefficients are carried separately as the balancer's variables).
    Returns ``None`` for anything malformed or containing an unknown element token — a formula
    the parser cannot prove well-formed never reaches conservation checking.
    """
    if not isinstance(formula, str):
        return None
    s = formula.strip().replace(" ", "")
    if not s:
        return None
    # A charge suffix (e.g. SO4^2-, Na+) is stripped for counting — conservation is over atoms.
    s = re.sub(r"[\^]?\d*[+-]$", "", s)
    if not s:
        return None
    # Reject any character outside the formula alphabet before tokenizing.
    if not re.fullmatch(r"[A-Za-z0-9()\[\]]+", s):
        return None

    tokens = _TOKEN_RE.findall(s)
    # A well-formed formula is fully covered by the tokenizer; leftover junk means malformed.
    if "".join(tokens) != s:
        return None

    pos = 0

    def parse_group(depth: int) -> dict[str, int] | None:
        nonlocal pos
        counts: dict[str, int] = {}
        while pos < len(tokens):
            tok = tokens[pos]
            if tok in (")", "]"):
                if depth == 0:
                    return None  # unmatched close
                pos += 1
                mult = _take_int()
                return {k: v * mult for k, v in counts.items()}
            if tok in ("(", "["):
                pos += 1
                inner = parse_group(depth + 1)
                if inner is None:
                    return None
                for k, v in inner.items():
                    counts[k] = counts.get(k, 0) + v
            elif tok[0].isalpha():
                if tok not in ATOMIC_WEIGHT:
                    return None  # unknown element token
                pos += 1
                mult = _take_int()
                counts[tok] = counts.get(tok, 0) + mult
            else:  # a bare number with no element/group in front of it
                return None
        if depth != 0:
            return None  # unmatched open
        return counts

    def _take_int() -> int:
        nonlocal pos
        if pos < len(tokens) and tokens[pos].isdigit():
            n = int(tokens[pos])
            pos += 1
            return n if n > 0 else 0
        return 1

    result = parse_group(0)
    if result is None or not result or pos != len(tokens):
        return None
    return result


def molar_mass(formula: str) -> float | None:
    """Molar mass in g/mol, or ``None`` if the formula is malformed or uses an element outside
    the built-in table (never fabricated)."""
    counts = parse_formula(formula)
    if counts is None:
        return None
    total = 0.0
    for el, n in counts.items():
        w = ATOMIC_WEIGHT.get(el)
        if w is None:
            return None
        total += w * n
    return round(total, 3)


# --- balance checking (element conservation — pure math) ----------------------------------


def _side_totals(terms: list[tuple[int, str]]) -> dict[str, int] | None:
    total: dict[str, int] = {}
    for coeff, formula in terms:
        if not isinstance(coeff, int) or coeff <= 0:
            return None
        counts = parse_formula(formula)
        if counts is None:
            return None
        for el, n in counts.items():
            total[el] = total.get(el, 0) + coeff * n
    return total or None


def is_balanced(reactants: list[tuple[int, str]], products: list[tuple[int, str]]) -> bool:
    """True iff every element is conserved across the equation at the given coefficients.

    ``reactants``/``products`` are lists of ``(coefficient, formula)``. This is the exact,
    deterministic check the client runs live as the learner adjusts coefficients, mirrored
    here so an authored answer that does NOT balance is refused at the door.
    """
    left = _side_totals(reactants)
    right = _side_totals(products)
    if left is None or right is None:
        return False
    return left == right


# --- SMILES syntax + coarse-valence validity ----------------------------------------------

_SMILES_ORGANIC = re.compile(r"[BCNOPSFI]|Cl|Br")
_SMILES_ALLOWED = re.compile(r"[A-Za-z0-9()\[\]=#\-+@%./\\:]")


def valid_smiles(smiles: str) -> bool:
    """Well-formedness + coarse valence sanity for a SMILES string (see module docstring for
    the honest ceiling). Checks: allowed characters only; balanced ``()`` and ``[]``; every
    ring-closure digit paired; bare atoms drawn from the organic subset; and no organic-subset
    atom exceeding its common maximum valence from explicit bonds + ring closures.
    """
    if not isinstance(smiles, str):
        return False
    s = smiles.strip()
    if not s or len(s) > 300:
        return False
    if any(not _SMILES_ALLOWED.match(ch) for ch in s):
        return False

    # bracket balance
    paren = 0
    square = 0
    for ch in s:
        if ch == "(":
            paren += 1
        elif ch == ")":
            paren -= 1
        elif ch == "[":
            square += 1
        elif ch == "]":
            square -= 1
        if paren < 0 or square < 0:
            return False
    if paren != 0 or square != 0:
        return False

    # Walk the organic-subset atoms (outside brackets), counting bonds for a coarse valence tally.
    # Ring-closure digits must pair up; each pairing is one bond on both partner atoms.
    valence: list[int] = []  # per-atom bond count, indexed by atom order
    atom_symbol: list[str] = []
    open_rings: dict[str, int] = {}  # ring digit -> atom index that opened it
    i = 0
    n = len(s)
    last_atom = -1
    pending_bond = 1  # bond order to the NEXT atom (default single)
    while i < n:
        ch = s[i]
        if ch == "[":
            # find the element inside the bracket for the whitelist check
            j = s.find("]", i)
            if j == -1:
                return False
            inner = s[i + 1 : j]
            m = re.search(r"[A-Z][a-z]?", inner)
            if m and m.group(0) not in ATOMIC_WEIGHT:
                return False
            atom_symbol.append(m.group(0) if m else "*")
            valence.append(0)
            idx = len(valence) - 1
            if last_atom >= 0:
                valence[last_atom] += pending_bond
                valence[idx] += pending_bond
            last_atom = idx
            pending_bond = 1
            i = j + 1
            continue
        if ch in "=#":
            pending_bond = 2 if ch == "=" else 3
            i += 1
            continue
        if ch in "-+/\\:.@":
            # bond symbols / stereo / disconnection — do not consume an atom
            if ch == ".":
                last_atom = -1  # disconnected fragment: no bond across the dot
            i += 1
            continue
        if ch in "()":
            if ch == "(":
                # a branch: remember the current atom to bond the branch's first atom to it
                branch_stack.append(last_atom)
            else:
                if branch_stack:
                    last_atom = branch_stack.pop()
            i += 1
            continue
        if ch == "%":
            # two-digit ring closure %nn
            ring = s[i + 1 : i + 3]
            if len(ring) != 2 or not ring.isdigit():
                return False
            _close_ring(ring, open_rings, valence, last_atom)
            i += 3
            continue
        if ch.isdigit():
            _close_ring(ch, open_rings, valence, last_atom)
            i += 1
            continue
        # a bare organic-subset atom (one or two letters: Cl, Br, or a single upper[+lower])
        m = _SMILES_ORGANIC.match(s, i)
        if not m:
            # lowercase aromatic atoms (c, n, o, s, p) — accept as organic aromatic
            if ch in "cnops":
                atom_symbol.append(ch.upper())
                valence.append(0)
                idx = len(valence) - 1
                if last_atom >= 0:
                    valence[last_atom] += pending_bond
                    valence[idx] += pending_bond
                last_atom = idx
                pending_bond = 1
                i += 1
                continue
            return False
        sym = m.group(0)
        atom_symbol.append(sym)
        valence.append(0)
        idx = len(valence) - 1
        if last_atom >= 0:
            valence[last_atom] += pending_bond
            valence[idx] += pending_bond
        last_atom = idx
        pending_bond = 1
        i += len(sym)

    if open_rings:
        return False  # an unpaired ring-closure digit

    # coarse valence: no atom may exceed its common maximum from heavy-atom bonds alone
    for sym, v in zip(atom_symbol, valence, strict=True):
        cap = _MAX_VALENCE.get(sym)
        if cap is not None and v > cap:
            return False
    return True


# branch stack is module-local to keep valid_smiles readable; reset per call
branch_stack: list[int] = []


def _close_ring(digit: str, open_rings: dict[str, int], valence: list[int], atom: int) -> None:
    if atom < 0:
        return
    if digit in open_rings:
        partner = open_rings.pop(digit)
        valence[partner] += 1
        valence[atom] += 1
    else:
        open_rings[digit] = atom


def valid_smiles_reset(smiles: str) -> bool:
    """valid_smiles with the module-local branch stack reset — the public entry point."""
    global branch_stack
    branch_stack = []
    return valid_smiles(smiles)


if __name__ == "__main__":
    # ponytail: one runnable assert block — the smallest thing that fails if the logic breaks.

    # formula parsing + nested groups
    assert parse_formula("H2O") == {"H": 2, "O": 1}
    assert parse_formula("Ca(OH)2") == {"Ca": 1, "O": 2, "H": 2}
    assert parse_formula("Al2(SO4)3") == {"Al": 2, "S": 3, "O": 12}
    assert parse_formula("K4[Fe(CN)6]") == {"K": 4, "Fe": 1, "C": 6, "N": 6}
    assert parse_formula("Xx2") is None  # unknown element
    assert parse_formula("(OH") is None  # unmatched
    assert parse_formula("2H2O") is None  # leading coefficient is not part of a formula
    assert parse_formula("") is None

    # molar mass (stoichiometry)
    assert molar_mass("H2O") == 18.015
    assert abs(molar_mass("CO2") - 44.009) < 1e-6
    assert molar_mass("Uut2") is None

    # balance checker — the deterministic crown
    # 2 H2 + O2 -> 2 H2O  (balanced)
    assert is_balanced([(2, "H2"), (1, "O2")], [(2, "H2O")]) is True
    # 1 H2 + O2 -> H2O  (NOT balanced — H and O both wrong)
    assert is_balanced([(1, "H2"), (1, "O2")], [(1, "H2O")]) is False
    # CH4 + 2 O2 -> CO2 + 2 H2O (balanced combustion)
    assert is_balanced([(1, "CH4"), (2, "O2")], [(1, "CO2"), (2, "H2O")]) is True
    # CH4 + O2 -> CO2 + H2O  (NOT balanced)
    assert is_balanced([(1, "CH4"), (1, "O2")], [(1, "CO2"), (1, "H2O")]) is False
    # 2 Na + 2 H2O -> 2 NaOH + H2 (balanced)
    assert is_balanced([(2, "Na"), (2, "H2O")], [(2, "NaOH"), (1, "H2")]) is True
    # a zero/negative coefficient is never balanced
    assert is_balanced([(0, "H2"), (1, "O2")], [(2, "H2O")]) is False

    # SMILES validity — syntax + coarse valence
    assert valid_smiles_reset("O") is True  # water (as O)
    assert valid_smiles_reset("CCO") is True  # ethanol
    assert valid_smiles_reset("c1ccccc1") is True  # benzene (aromatic ring, closure paired)
    assert valid_smiles_reset("CC(=O)O") is True  # acetic acid
    assert valid_smiles_reset("C1CCCCC1") is True  # cyclohexane
    assert valid_smiles_reset("[Na+]") is True  # bracketed ion
    assert valid_smiles_reset("C(C)(C)(C)(C)C") is False  # carbon with 5 heavy bonds — over-valent
    assert valid_smiles_reset("C1CCC") is False  # unpaired ring closure
    assert valid_smiles_reset("CC(O") is False  # unbalanced paren
    assert valid_smiles_reset("CC[O") is False  # unbalanced bracket
    assert valid_smiles_reset("C$C") is False  # illegal character
    assert valid_smiles_reset("") is False
    assert valid_smiles_reset("[Zz]") is False  # unknown bracketed element

    print("chem.py self-check passed: formula parse, molar mass, balance, SMILES validity")
