import { CmsPageView, cmsMetadata } from "@/components/cms/cms-page";

export const generateMetadata = () => cmsMetadata("craft");

export default function Page() {
  return <CmsPageView slug="craft" />;
}
