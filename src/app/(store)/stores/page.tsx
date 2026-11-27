import { CmsPageView, cmsMetadata } from "@/components/cms/cms-page";

export const generateMetadata = () => cmsMetadata("stores");

export default function Page() {
  return <CmsPageView slug="stores" />;
}
