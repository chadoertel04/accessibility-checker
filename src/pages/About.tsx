import Layout from "@/components/Layout";

export default function About() {
  return (
    <Layout mainClassName="text-center">
      <div className="mt-10">
        <h1 className="text-4xl font-extrabold dark:text-gray-200">About</h1>
        <p className="mb-4 text-lg font-normal text-gray-500 dark:text-gray-400">
          Web application for getting all accessibility information on a desired
          venue through Google Maps.
        </p>
      </div>
    </Layout>
  );
}
