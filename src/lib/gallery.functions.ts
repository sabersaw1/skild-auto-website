// Public gallery reads. Published projects only — RLS enforces it too.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type ProjectPhoto = {
  id: string;
  image_type: "before" | "after" | "additional";
  sort_order: number;
  caption: string | null;
  alt_text: string | null;
  url: string;
};

export type PublicProject = {
  id: string;
  slug: string;
  title: string;
  vehicle_kind: string | null;
  vehicle_year: number | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  service_category: string | null;
  problem: string | null;
  work_performed: string | null;
  result: string | null;
  parts_used: string | null;
  description: string | null;
  project_date: string | null;
  project_photos: ProjectPhoto[];
};

const SELECT = `id, slug, title, vehicle_kind, vehicle_year, vehicle_make, vehicle_model,
  service_category, problem, work_performed, result, parts_used, description, project_date,
  project_photos(id, image_type, sort_order, caption, alt_text, url)`;

export const listPublishedProjects = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { getSkildPublicDb } = await import("./skild-public.server");
    const { data, error } = await getSkildPublicDb()
      .from("projects")
      .select(SELECT)
      .eq("is_published", true)
      .order("project_date", { ascending: false, nullsFirst: false })
      .limit(60);
    if (error) return { projects: [] as PublicProject[], available: false };
    return { projects: (data ?? []) as unknown as PublicProject[], available: true };
  } catch {
    return { projects: [] as PublicProject[], available: false };
  }
});

export const getPublishedProject = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => z.object({ slug: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    try {
      const { getSkildPublicDb } = await import("./skild-public.server");
      const { data: row } = await getSkildPublicDb()
        .from("projects")
        .select(SELECT)
        .eq("slug", data.slug)
        .eq("is_published", true)
        .maybeSingle();
      return { project: (row as unknown as PublicProject) ?? null };
    } catch {
      return { project: null };
    }
  });
