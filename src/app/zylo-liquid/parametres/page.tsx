import { redirect } from "next/navigation";

// Fusionné dans /zylo-liquid/configuration (Bloc 5 de
// refonte-configuration-zylo-liquid.md, Phase 4 §5) — route conservée
// pour ne pas casser d'éventuels favoris/liens existants.
export default function ParametresRedirect() {
  redirect("/zylo-liquid/configuration");
}
