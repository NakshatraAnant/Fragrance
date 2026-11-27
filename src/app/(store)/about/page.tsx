import { CmsPageView, cmsMetadata } from "@/components/cms/cms-page";

export const generateMetadata = () => cmsMetadata("about");

export default function Page() {
  return <CmsPageView slug="about" />;
}
