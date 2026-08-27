import Layout from "@/components/Layout";
import { useAuth } from "@/auth/AuthContext";
import { keycloak } from "@/auth/keycloak";

function formatRoles(roles: string[]) {
  if (roles.length === 0) {
    return "No roles assigned";
  }

  return roles.join(", ");
}

export default function Account() {
  const { username, roles, isAuthenticated } = useAuth();

  const handleChangePassword = () => {
    const accountUrl = keycloak.createAccountUrl({
      redirectUri: window.location.href,
    });
    window.location.assign(accountUrl);
  };

  return (
    <Layout>
      <section className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
            Account
          </h1>
          <p className="mt-3 text-base sm:text-lg text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
            Review your account details and update your security settings.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="max-w-3xl">
          <article className="rounded-2xl bg-white dark:bg-slate-900 p-6 sm:p-7 ring-1 ring-slate-200 dark:ring-slate-700 shadow-sm space-y-6">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
              Basic information
            </h2>
            <dl className="mt-5 divide-y divide-slate-200 dark:divide-slate-800">
              <div className="py-3 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4">
                <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Username
                </dt>
                <dd className="sm:col-span-2 text-sm text-slate-900 dark:text-slate-100">
                  {username ?? "Unavailable"}
                </dd>
              </div>
              <div className="py-3 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4">
                <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Authentication
                </dt>
                <dd className="sm:col-span-2">
                  <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 ring-1 ring-inset ring-emerald-200 dark:ring-emerald-900">
                    {isAuthenticated ? "Signed in" : "Signed out"}
                  </span>
                </dd>
              </div>
              <div className="py-3 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4">
                <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Roles
                </dt>
                <dd className="sm:col-span-2 text-sm text-slate-900 dark:text-slate-100">
                  {formatRoles(roles)}
                </dd>
              </div>
            </dl>

            <div className="pt-1 border-t border-slate-200 dark:border-slate-800">
              <h3 className="pt-5 text-base font-semibold text-slate-900 dark:text-slate-50">
                Security
              </h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl">
                Manage your password in your secure identity provider settings.
              </p>
              <button
                type="button"
                onClick={handleChangePassword}
                className="mt-5 inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
              >
                Change password
              </button>
            </div>
          </article>
        </div>
      </section>
    </Layout>
  );
}
