import { Link } from "react-router";
import { redirect } from "react-router";
import { Filter, Heart, Plus, SlidersHorizontal } from "lucide-react";

import { getSessionUser } from "@/lib/auth/session";
import {
  listAssignableCustomerCaregivers,
  listCustomers,
  type CustomerListFilters,
} from "@/lib/services/customer-service";
import { canManageCustomer } from "@/lib/permissions";
import { CustomerCard } from "@/components/customer/customer-card";

type CustomersSearchParams = {
  [key: string]: string | string[] | undefined;
};

const INTERACTION_RECENCY_OPTIONS = [
  { label: "Chưa từng tương tác", value: "NO_INTERACTION" },
  { label: "Có tương tác hôm nay", value: "TODAY" },
  { label: "Cần chăm: từ 3 ngày", value: "OVERDUE_3" },
  { label: "Cần chăm: từ 7 ngày", value: "OVERDUE_7" },
] as const satisfies readonly {
  label: string;
  value: NonNullable<CustomerListFilters["interactionRecency"]>;
}[];

const SORT_OPTIONS = [
  { label: "Mới tạo trước", value: "NEWEST" },
  { label: "Cũ tạo trước", value: "OLDEST" },
  { label: "Tên A-Z", value: "NAME_ASC" },
  { label: "Tương tác mới nhất", value: "LAST_INTERACTION_NEWEST" },
  { label: "Cần chăm trước", value: "LAST_INTERACTION_OLDEST" },
] as const satisfies readonly {
  label: string;
  value: NonNullable<CustomerListFilters["sort"]>;
}[];

function getSearchParams(request: Request) {
  const url = new URL(request.url);
  const result: Record<string, string | string[]> = {};

  for (const [key, value] of url.searchParams) {
    const current = result[key];
    if (Array.isArray(current)) {
      current.push(value);
    } else if (current !== undefined) {
      result[key] = [current, value];
    } else {
      result[key] = value;
    }
  }

  return result;
}

export function loader({ request }: { request: Request }) {
  return { searchParams: getSearchParams(request) };
}

function firstParam(
  searchParams: CustomersSearchParams,
  key: string,
): string | undefined {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

function pickParam<T extends readonly string[]>(
  value: string | undefined,
  options: T,
): T[number] | undefined {
  return value && options.includes(value) ? value : undefined;
}

function parseFilters(searchParams: CustomersSearchParams): CustomerListFilters {
  return {
    caregiverId: firstParam(searchParams, "caregiverId") || undefined,
    interactionRecency: pickParam(
      firstParam(searchParams, "recency"),
      INTERACTION_RECENCY_OPTIONS.map((option) => option.value),
    ),
    sort:
      pickParam(
        firstParam(searchParams, "sort"),
        SORT_OPTIONS.map((option) => option.value),
      ) ?? "NEWEST",
  };
}

function countActiveFilters(filters: CustomerListFilters) {
  return [
    filters.caregiverId,
    filters.interactionRecency,
  ].filter(Boolean).length;
}

export async function ServerComponent({
  loaderData,
}: {
  loaderData: { searchParams: CustomersSearchParams };
}) {
  const session = await getSessionUser();
  if (!session) throw redirect("/login");

  const filters = parseFilters(loaderData.searchParams);
  const [customers, caregiverOptions] = await Promise.all([
    listCustomers(session, filters),
    listAssignableCustomerCaregivers(session),
  ]);
  const activeFilterCount = countActiveFilters(filters);

  return (
    <div className="mx-auto max-w-2xl space-y-5 animate-slide-up">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-lg font-bold tracking-tight">
            Học viên
          </h1>
          <p className="text-xs text-muted-foreground">
            {customers.length} học viên
            {activeFilterCount > 0 ? ` theo ${activeFilterCount} bộ lọc` : " đang quản lý"}
          </p>
        </div>
        {canManageCustomer(session) && (
          <Link
            to="/customers/new"
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" />
            Tạo mới
          </Link>
        )}
      </div>

      <form
        action="/customers"
        className="glass-card space-y-2.5 p-3 sm:space-y-3 sm:p-4"
        method="get"
      >
        <div className="hidden items-center gap-2 text-xs font-semibold text-muted-foreground sm:flex">
          <SlidersHorizontal className="h-4 w-4" />
          Bộ lọc học viên
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
          <label className="col-span-2 space-y-1 sm:col-span-1">
            <span className="text-[11px] font-medium text-muted-foreground">
              Người chăm sóc
            </span>
            <select
              className="min-h-10 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/40 sm:min-h-11 sm:px-3 sm:py-2"
              defaultValue={filters.caregiverId ?? ""}
              name="caregiverId"
            >
              <option value="">Tất cả</option>
              {caregiverOptions.map((caregiver) => (
                <option key={caregiver.id} value={caregiver.id}>
                  {caregiver.fullName} · {caregiver.roleLabel}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground">
              Tương tác cuối
            </span>
            <select
              className="min-h-10 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] outline-none focus:ring-2 focus:ring-primary/40 sm:min-h-11 sm:px-3 sm:py-2 sm:text-xs"
              defaultValue={filters.interactionRecency ?? ""}
              name="recency"
            >
              <option value="">Tất cả</option>
              {INTERACTION_RECENCY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground">
              Sắp xếp
            </span>
            <select
              className="min-h-10 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] outline-none focus:ring-2 focus:ring-primary/40 sm:min-h-11 sm:px-3 sm:py-2 sm:text-xs"
              defaultValue={filters.sort ?? "NEWEST"}
              name="sort"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 sm:min-h-11 sm:px-4"
            type="submit"
          >
            <Filter className="h-3.5 w-3.5" />
            Lọc học viên
          </button>
          {activeFilterCount > 0 && (
            <Link
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-overlay-subtle px-3 py-2 text-xs font-semibold ring-1 ring-border transition hover:bg-overlay-medium sm:min-h-11 sm:px-4"
              to="/customers"
            >
              Xóa lọc
            </Link>
          )}
        </div>
      </form>

      {customers.length > 0 ? (
        <div className="space-y-3">
          {customers.map((customer) => (
            <CustomerCard key={customer.id} customer={customer} />
          ))}
        </div>
      ) : (
        <div className="glass-card flex flex-col items-center px-5 py-14 text-center">
          <Heart className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium">
            {activeFilterCount > 0
              ? "Không có học viên phù hợp."
              : "Chưa có học viên nào."}
          </p>
          <p className="mt-1 max-w-xs text-xs text-muted-foreground">
            {activeFilterCount > 0
              ? "Thử nới điều kiện lọc hoặc tìm theo từ khóa khác."
              : "Bắt đầu chăm sóc bằng cách tạo hồ sơ học viên đầu tiên."}
          </p>
          {canManageCustomer(session) && activeFilterCount === 0 && (
            <Link
              to="/customers/new"
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
            >
              <Plus className="h-3.5 w-3.5" />
              Tạo học viên
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
