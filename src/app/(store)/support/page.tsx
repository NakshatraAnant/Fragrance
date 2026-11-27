import { CmsPageView, cmsMetadata } from "@/components/cms/cms-page";

export const generateMetadata = () => cmsMetadata("support");

export default function Page() {
  return <CmsPageView slug="support" />;
}
