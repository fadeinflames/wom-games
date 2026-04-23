import { requireUser } from "@/lib/auth";
import { CreatePackForm } from "@/components/create-pack-form";

export default async function NewPackPage() {
  await requireUser();
  return <CreatePackForm />;
}
