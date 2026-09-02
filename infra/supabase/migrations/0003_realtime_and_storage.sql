-- Realtime: Wobo canvas co-presence, meter updates, mastery/ignite echoes.
alter publication supabase_realtime add table learner.canvas_state;
alter publication supabase_realtime add table learner.meter_state;
alter publication supabase_realtime add table learner.mastery_cache;

-- Storage buckets (private; access mediated server-side): media nuggets, generated illustration
-- assets, Remotion renders.
insert into storage.buckets (id, name, public)
values
  ('media-nuggets', 'media-nuggets', false),
  ('generated-assets', 'generated-assets', false),
  ('remotion-renders', 'remotion-renders', false)
on conflict (id) do nothing;
