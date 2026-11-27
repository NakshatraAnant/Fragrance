import { CmsPageView, cmsMetadata } from "@/components/cms/cms-page";

export const generateMetadata = () => cmsMetadata("shipping");

export default function Page() {
  return <CmsPageView slug="shipping" />;
}
