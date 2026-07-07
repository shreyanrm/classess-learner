// Ambient declaration for the RDKit-js WASM asset imported as a Vite URL (ChemScene.tsx lazy loader).
// The package ships JS/TS types for '@rdkit/rdkit' itself; only the `?url` asset query needs a shim.
declare module '@rdkit/rdkit/dist/RDKit_minimal.wasm?url' {
  const url: string;
  export default url;
}
