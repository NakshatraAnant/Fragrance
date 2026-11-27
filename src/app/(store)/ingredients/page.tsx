import { CmsPageView, cmsMetadata } from "@/components/cms/cms-page";

export const generateMetadata = () => cmsMetadata("ingredients");

export default function Page() {
  return <CmsPageView slug="ingredients" />;
}
