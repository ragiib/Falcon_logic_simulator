import { z } from 'zod';

export const pinRefSchema = z.object({
  componentId: z.string().min(1).max(100),
  pinId: z.string().min(1).max(100),
});

export const componentSchema = z.object({
  id: z.string().min(1).max(100),
  type: z.string().min(1).max(100),
  position: z.object({
    x: z.number().finite(),
    y: z.number().finite(),
  }),
  params: z.record(z.string(), z.union([z.number().finite(), z.string(), z.boolean()])),
  label: z.string().optional(),
});

export const wireSchema = z.object({
  id: z.string().min(1).max(100),
  from: pinRefSchema,
  to: pinRefSchema,
});

export const circuitFileSchema = z
  .object({
    version: z.number().int().min(1),
    name: z.string(),
    components: z.array(componentSchema),
    wires: z.array(wireSchema),
  })
  .passthrough();
