"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

import {
  buildCategoryLabel,
  buildCategoryPathMap,
  buildCategoryTree,
  filterCategoryTree,
  pruneAncestorCategoryIds,
} from "@/lib/category-utils";
import type { Assignments, BootstrapPayload, CategoryNode, ProductRecord } from "@/lib/types";

type SaveState = "idle" | "saving" | "saved" | "error";
type ProductFilter = "all" | "assigned" | "unassigned";

function ProductFilterButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      className={
        active
          ? "rounded-full bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white"
          : "rounded-full border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
      }
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function ProductNavButton({
  children,
  disabled,
  onClick,
}: {
  children: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={
        disabled
          ? "rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-400"
          : "rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 transition-colors hover:border-zinc-900 hover:bg-zinc-900 hover:text-white focus-visible:border-zinc-900 focus-visible:bg-zinc-900 focus-visible:text-white focus-visible:outline-none"
      }
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function CategoryBranch({
  node,
  selectedCategoryIds,
  onToggle,
}: {
  node: CategoryNode;
  selectedCategoryIds: Set<number>;
  onToggle: (categoryId: number) => void;
}) {
  const checked = selectedCategoryIds.has(node.category.id);

  if (node.children.length === 0) {
    return (
      <label className="flex items-start gap-3 rounded-lg px-2 py-1.5 hover:bg-zinc-50">
        <input
          checked={checked}
          className="mt-1 h-4 w-4 rounded border-zinc-300"
          onChange={() => onToggle(node.category.id)}
          type="checkbox"
        />
        <span className="text-sm text-zinc-800">{node.category.name}</span>
      </label>
    );
  }

  return (
    <details className="rounded-xl border border-zinc-200 bg-white p-2" open>
      <summary className="cursor-pointer list-none">
        <label className="flex items-start gap-3 pr-6">
          <input
            checked={checked}
            className="mt-1 h-4 w-4 rounded border-zinc-300"
            onChange={() => onToggle(node.category.id)}
            type="checkbox"
          />
          <span className="text-sm font-medium text-zinc-900">{node.category.name}</span>
        </label>
      </summary>
      <div className="mt-2 ml-4 space-y-1 border-l border-zinc-200 pl-3">
        {node.children.map((childNode) => (
          <CategoryBranch
            key={childNode.category.id}
            node={childNode}
            onToggle={onToggle}
            selectedCategoryIds={selectedCategoryIds}
          />
        ))}
      </div>
    </details>
  );
}

export function EditorApp({ initialToken }: { initialToken: string }) {
  const [data, setData] = useState<BootstrapPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [productFilter, setProductFilter] = useState<ProductFilter>("all");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveMessage, setSaveMessage] = useState("Jeszcze nic nie zapisano.");
  const [stickyVisibleProductId, setStickyVisibleProductId] = useState<number | null>(null);
  const token = initialToken;
  const deferredProductSearch = useDeferredValue(productSearch);
  const deferredCategorySearch = useDeferredValue(categorySearch);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRequestVersionRef = useRef(0);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        const search = token ? `?token=${encodeURIComponent(token)}` : "";
        const response = await fetch(`/api/bootstrap${search}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(response.status === 401 ? "Brak dostepu do aplikacji." : "Nie udalo sie zaladowac danych.");
        }

        const payload: BootstrapPayload = await response.json();

        setData(payload);
        setSelectedProductId(payload.products[0]?.Identyfikator ?? null);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setLoadError(error instanceof Error ? error.message : "Nieznany blad ladowania.");
      }
    };

    load();

    return () => controller.abort();
  }, [token]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const pathMap = useMemo(() => {
    return data ? buildCategoryPathMap(data.categories) : new Map<number, string>();
  }, [data]);

  const categoryTree = useMemo(() => {
    return data ? buildCategoryTree(data.categories) : [];
  }, [data]);

  const filteredTree = useMemo(() => {
    return filterCategoryTree(categoryTree, deferredCategorySearch, pathMap);
  }, [categoryTree, deferredCategorySearch, pathMap]);

  const filteredProducts = useMemo(() => {
    if (!data) {
      return [];
    }

    const normalizedQuery = deferredProductSearch.trim().toLocaleLowerCase("pl");

    return data.products.filter((product) => {
      const assignedCategoryIds = data.assignments[String(product.Identyfikator)] ?? [];
      const isStickyVisible = product.Identyfikator === stickyVisibleProductId;
      const matchesFilter =
        productFilter === "all" ||
        (productFilter === "assigned" && assignedCategoryIds.length > 0) ||
        (productFilter === "unassigned" && assignedCategoryIds.length === 0);

      if (!matchesFilter && !isStickyVisible) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return (
        product.Nazwa.toLocaleLowerCase("pl").includes(normalizedQuery) ||
        String(product.SKU).toLocaleLowerCase("pl").includes(normalizedQuery)
      );
    });
  }, [data, deferredProductSearch, productFilter, stickyVisibleProductId]);

  const selectedProduct = useMemo(() => {
    if (!data) {
      return null;
    }

    if (selectedProductId !== null) {
      const selectedFromFilter = filteredProducts.find(
        (product) => product.Identyfikator === selectedProductId,
      );

      if (selectedFromFilter) {
        return selectedFromFilter;
      }
    }

    return filteredProducts[0] ?? null;
  }, [data, filteredProducts, selectedProductId]);

  const currentSelectedProductId = selectedProduct?.Identyfikator ?? null;

  const selectedCategoryIds = useMemo(() => {
    if (!data || !selectedProduct) {
      return [];
    }

    return data.assignments[String(selectedProduct.Identyfikator)] ?? [];
  }, [data, selectedProduct]);

  const selectedCategoryIdSet = useMemo(() => new Set(selectedCategoryIds), [selectedCategoryIds]);

  const progress = useMemo(() => {
    if (!data) {
      return { assigned: 0, total: 0 };
    }

    const assigned = data.products.filter(
      (product) => (data.assignments[String(product.Identyfikator)] ?? []).length > 0,
    ).length;

    return {
      assigned,
      total: data.products.length,
    };
  }, [data]);

  const currentCategoryLabel = useMemo(() => {
    const exportCategoryIds = data
      ? pruneAncestorCategoryIds(selectedCategoryIds, data.categories)
      : selectedCategoryIds;

    return buildCategoryLabel(exportCategoryIds, pathMap);
  }, [data, pathMap, selectedCategoryIds]);

  const saveAssignmentsWithDebounce = (assignments: Assignments, product: ProductRecord) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setSaveState("saving");
    setSaveMessage(`Zapisze za chwile: ${product.Nazwa}`);

    saveTimeoutRef.current = setTimeout(async () => {
      const requestVersion = saveRequestVersionRef.current + 1;
      saveRequestVersionRef.current = requestVersion;

      try {
        const search = token ? `?token=${encodeURIComponent(token)}` : "";
        const response = await fetch(`/api/assign${search}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ assignments }),
        });

        if (!response.ok) {
          throw new Error("Nie udalo sie zapisac przypisania.");
        }

        if (saveRequestVersionRef.current === requestVersion) {
          setSaveState("saved");
          setSaveMessage(`Zapisano: ${product.Nazwa}`);
        }
      } catch {
        if (saveRequestVersionRef.current === requestVersion) {
          setSaveState("error");
          setSaveMessage(`Blad zapisu: ${product.Nazwa}`);
        }
      }
    }, 450);
  };

  const toggleCategory = (categoryId: number) => {
    if (!data || !selectedProduct) {
      return;
    }

    const currentCategoryIds = data.assignments[String(selectedProduct.Identyfikator)] ?? [];
    const currentSet = new Set(currentCategoryIds);

    if (currentSet.has(categoryId)) {
      currentSet.delete(categoryId);
    } else {
      currentSet.add(categoryId);
    }

    const nextCategoryIds = [...currentSet].sort((left, right) => left - right);
    const nextAssignments = {
      ...data.assignments,
    };

    if (nextCategoryIds.length === 0) {
      delete nextAssignments[String(selectedProduct.Identyfikator)];
    } else {
      nextAssignments[String(selectedProduct.Identyfikator)] = nextCategoryIds;
    }

    const nextData: BootstrapPayload = {
      ...data,
      assignments: nextAssignments,
    };

    if (productFilter === "unassigned" && nextCategoryIds.length > 0) {
      setStickyVisibleProductId(selectedProduct.Identyfikator);
    }

    setData(nextData);
    saveAssignmentsWithDebounce(nextAssignments, selectedProduct);
  };

  const selectedProductIndex = currentSelectedProductId
    ? filteredProducts.findIndex((product) => product.Identyfikator === currentSelectedProductId)
    : -1;
  const previousProduct = selectedProductIndex > 0 ? filteredProducts[selectedProductIndex - 1] : null;
  const nextProduct =
    selectedProductIndex >= 0 && selectedProductIndex < filteredProducts.length - 1
      ? filteredProducts[selectedProductIndex + 1]
      : null;

  if (loadError) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6 py-16">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-900">
          <p className="text-lg font-semibold">Nie udalo sie uruchomic aplikacji.</p>
          <p className="mt-2 text-sm">{loadError}</p>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6 py-16">
        <p className="text-sm text-zinc-600">Ladowanie danych...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <header className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-4 text-sm text-zinc-600">
                <p>
                  Postep: {progress.assigned} / {progress.total}
                </p>
                <p>{Math.round((progress.assigned / Math.max(progress.total, 1)) * 100)}%</p>
              </div>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-zinc-900 transition-[width] duration-200"
                  style={{ width: `${(progress.assigned / Math.max(progress.total, 1)) * 100}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-zinc-600">
                Z przypisaniem: {progress.assigned}. Bez przypisania: {progress.total - progress.assigned}.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
                href={`/api/export/json${token ? `?token=${encodeURIComponent(token)}` : ""}`}
              >
                Eksport JSON
              </a>
              <a
                className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
                href={`/api/export/csv${token ? `?token=${encodeURIComponent(token)}` : ""}`}
              >
                Eksport CSV
              </a>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-zinc-600">
            <span
              className={
                saveState === "error"
                  ? "rounded-full bg-red-100 px-3 py-1 text-red-800"
                  : saveState === "saved"
                    ? "rounded-full bg-emerald-100 px-3 py-1 text-emerald-800"
                    : "rounded-full bg-zinc-100 px-3 py-1 text-zinc-700"
              }
            >
              {saveMessage}
            </span>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)_420px]">
          <aside className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3">
              <input
                className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none placeholder:text-zinc-400 focus:border-zinc-400"
                onChange={(event) => setProductSearch(event.target.value)}
                placeholder="Szukaj produktu lub SKU"
                value={productSearch}
              />
              <div className="flex flex-wrap gap-2">
                <ProductFilterButton
                  active={productFilter === "all"}
                  onClick={() => {
                    setProductFilter("all");
                    setStickyVisibleProductId(null);
                  }}
                >
                  Wszystkie
                </ProductFilterButton>
                <ProductFilterButton
                  active={productFilter === "assigned"}
                  onClick={() => {
                    setProductFilter("assigned");
                    setStickyVisibleProductId(null);
                  }}
                >
                  Przypisane
                </ProductFilterButton>
                <ProductFilterButton
                  active={productFilter === "unassigned"}
                  onClick={() => {
                    setProductFilter("unassigned");
                    setStickyVisibleProductId(null);
                  }}
                >
                  Bez przypisania
                </ProductFilterButton>
              </div>
            </div>

            <div className="mt-4 flex max-h-[70vh] flex-col gap-2 overflow-y-auto pr-1">
              {filteredProducts.map((product) => {
                const assignedCategoryIds = data.assignments[String(product.Identyfikator)] ?? [];
                const isSelected = product.Identyfikator === currentSelectedProductId;

                return (
                  <button
                    className={
                      isSelected
                        ? "rounded-2xl border border-zinc-900 bg-zinc-900 p-3 text-left text-white"
                        : "rounded-2xl border border-zinc-200 bg-white p-3 text-left hover:border-zinc-300 hover:bg-zinc-50"
                    }
                    key={product.Identyfikator}
                    onClick={() => {
                      setSelectedProductId(product.Identyfikator);
                      setStickyVisibleProductId(null);
                    }}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium leading-5">{product.Nazwa}</p>
                        <p className={isSelected ? "mt-1 text-xs text-zinc-300" : "mt-1 text-xs text-zinc-500"}>
                          SKU: {product.SKU}
                        </p>
                      </div>
                      <span
                        className={
                          assignedCategoryIds.length > 0
                            ? isSelected
                              ? "rounded-full bg-white/15 px-2 py-1 text-[11px] font-medium text-white"
                              : "rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-medium text-emerald-800"
                            : isSelected
                              ? "rounded-full bg-white/10 px-2 py-1 text-[11px] font-medium text-zinc-200"
                              : "rounded-full bg-zinc-100 px-2 py-1 text-[11px] font-medium text-zinc-600"
                        }
                      >
                        {assignedCategoryIds.length > 0 ? assignedCategoryIds.length : "0"}
                      </span>
                    </div>
                  </button>
                );
              })}
              {filteredProducts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500">
                  Brak produktow dla tego filtra.
                </div>
              ) : null}
            </div>
          </aside>

          <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
            {selectedProduct ? (
              <div className="flex h-full flex-col gap-4">
                <div className="flex min-h-36 flex-col justify-between gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="min-h-16">
                    <h2 className="text-2xl font-semibold tracking-tight">{selectedProduct.Nazwa}</h2>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <ProductNavButton
                      disabled={!previousProduct}
                      onClick={() => {
                        if (!previousProduct) {
                          return;
                        }

                        setSelectedProductId(previousProduct.Identyfikator);
                        setStickyVisibleProductId(null);
                      }}
                    >
                      Poprzedni produkt
                    </ProductNavButton>
                    <ProductNavButton
                      disabled={!nextProduct}
                      onClick={() => {
                        if (!nextProduct) {
                          return;
                        }

                        setSelectedProductId(nextProduct.Identyfikator);
                        setStickyVisibleProductId(null);
                      }}
                    >
                      Nastepny produkt
                    </ProductNavButton>
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-200 p-4 hidden">
                  <p className="text-sm font-medium text-zinc-800">Finalne pole `Kategorie`</p>
                  <p className="mt-2 min-h-16 rounded-xl bg-zinc-50 px-3 py-3 text-sm leading-6 text-zinc-700">
                    {currentCategoryLabel || "Brak przypisanych kategorii"}
                  </p>
                </div>

                <a
                  className="inline-flex w-fit rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
                  href={selectedProduct["URL produktu"]}
                  rel="noreferrer"
                  target="_blank"
                >
                  Otworz produkt w Woo
                </a>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                Wybierz produkt z listy.
              </div>
            )}
          </section>

          <aside className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3">
              <input
                className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none placeholder:text-zinc-400 focus:border-zinc-400"
                onChange={(event) => setCategorySearch(event.target.value)}
                placeholder="Szukaj kategorii"
                value={categorySearch}
              />
              <p className="text-sm text-zinc-500">
                Zaznacz wszystkie kategorie, ktore maja trafic do WooCommerce.
              </p>
            </div>

            <div className="mt-4 flex max-h-[70vh] flex-col gap-2 overflow-y-auto pr-1">
              {filteredTree.map((node) => (
                <CategoryBranch
                  key={node.category.id}
                  node={node}
                  onToggle={toggleCategory}
                  selectedCategoryIds={selectedCategoryIdSet}
                />
              ))}
              {filteredTree.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500">
                  Brak kategorii dla tego filtra.
                </div>
              ) : null}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
