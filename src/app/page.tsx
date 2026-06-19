import { EditorApp } from "@/components/editor-app";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Home({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const token = typeof resolvedSearchParams.token === "string" ? resolvedSearchParams.token : "";

  return <EditorApp initialToken={token} />;
}
