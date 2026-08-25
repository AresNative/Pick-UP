import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import categorias from "@/utils/constants/categorias";
import { clearFilters, dataFilter } from "@/hooks/reducers/filter";
import { useAppDispatch, useAppSelector } from "@/hooks/selector";
import { RootState } from "@/hooks/store";
import { cn } from "@/utils/functions/cn";

const CategorySlider: React.FC = () => {
    // ===== ESTADO GLOBAL =====
    const cat = useAppSelector((state: RootState) => state.filterData);
    const categoriaActiva = cat?.key?.value || "";
    const dispatch = useAppDispatch();

    // ===== ESTADO LOCAL =====
    const [searchTerm, setSearchTerm] = useState("");
    const sliderRef = useRef<HTMLDivElement>(null);
    const [showLeftArrow, setShowLeftArrow] = useState(false);
    const [showRightArrow, setShowRightArrow] = useState(true);

    // ===== DATOS =====
    const todoCategory = categorias.find((c) => c.name === "TODO");
    const otherCategories = categorias.filter((c) => c.name !== "TODO");

    // Filtro para la búsqueda (solo aplica en desktop)
    const filteredCategories = useMemo(
        () =>
            otherCategories.filter((c) =>
                c.name.toLowerCase().includes(searchTerm.toLowerCase())
            ),
        [otherCategories, searchTerm]
    );

    // ===== HANDLERS =====
    const handleTodoClick = useCallback(() => {
        dispatch(clearFilters());
        setSearchTerm("");
    }, [dispatch]);

    const handleCategoryClick = useCallback(
        (categoryName: string) => {
            dispatch(
                dataFilter({
                    key: "key",
                    value: categoryName,
                    type: "multi",
                })
            );
        },
        [dispatch]
    );

    const formatCategoryName = (name: string) =>
        name
            .toLowerCase()
            .replace(/\b\w/g, (c) => c.toUpperCase());

    // ===== LÓGICA DEL SLIDER (SOLO MÓVIL) =====
    const getScrollAmount = useCallback(() => {
        const container = sliderRef.current;
        if (!container) return 180;
        const firstChild = container.querySelector("button");
        if (!firstChild) return 180;
        const style = window.getComputedStyle(firstChild);
        const width = firstChild.offsetWidth;
        const gap = parseFloat(style.marginRight) || 12;
        return width + gap;
    }, []);

    const scroll = useCallback(
        (direction: "left" | "right") => {
            const container = sliderRef.current;
            if (!container) return;
            const amount = getScrollAmount();
            container.scrollBy({
                left: direction === "left" ? -amount : amount,
                behavior: "smooth",
            });
            setTimeout(() => {
                setShowLeftArrow(container.scrollLeft > 0);
                setShowRightArrow(
                    container.scrollLeft < container.scrollWidth - container.clientWidth - 5
                );
            }, 250);
        },
        [getScrollAmount]
    );

    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        const target = e.target as HTMLDivElement;
        setShowLeftArrow(target.scrollLeft > 0);
        setShowRightArrow(
            target.scrollLeft < target.scrollWidth - target.clientWidth - 5
        );
    }, []);

    // Recalcular flechas al redimensionar
    useEffect(() => {
        const container = sliderRef.current;
        if (!container) return;
        const checkArrows = () => {
            setShowLeftArrow(container.scrollLeft > 0);
            setShowRightArrow(
                container.scrollLeft < container.scrollWidth - container.clientWidth - 5
            );
        };
        checkArrows();
        window.addEventListener("resize", checkArrows);
        return () => window.removeEventListener("resize", checkArrows);
    }, []);

    return (
        <>
            {/* ===== DESKTOP ===== */}
            <aside className="hidden sticky top-2 z-40 md:flex md:flex-col md:w-64 md:flex-shrink-0 md:gap-3 md:py-2">
                {/* Buscador de categorías */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar categoría..."
                        className="w-full pl-9 pr-4 py-2 text-sm border bg-white border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Lista de categorías (scrollable) */}
                <nav className="flex flex-col gap-1 overflow-y-auto max-h-[70vh] pr-1">
                    {/* Botón "TODO" */}
                    <button
                        onClick={handleTodoClick}
                        className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-left transition-all",
                            categoriaActiva === ""
                                ? "bg-purple-100 text-purple-700 font-medium shadow-sm border border-purple-200"
                                : "hover:bg-gray-100 text-gray-700"
                        )}
                        role="tab"
                        aria-selected={categoriaActiva === ""}
                    >
                        <span className="text-sm">Todo</span>
                    </button>

                    {/* Separador */}
                    <hr className="my-1 border-gray-200" />

                    {/* Categorías filtradas */}
                    {filteredCategories.length === 0 ? (
                        <p className="text-sm text-gray-400 px-3 py-4 text-center">
                            No hay categorías
                        </p>
                    ) : (
                        filteredCategories.map((category) => {
                            const isActive = categoriaActiva === category.name;
                            return (
                                <button
                                    key={category.name}
                                    onClick={() => handleCategoryClick(category.name)}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-left transition-all",
                                        isActive
                                            ? "bg-purple-100 text-purple-700 font-medium shadow-sm border border-purple-200"
                                            : "hover:bg-gray-100 text-gray-700"
                                    )}
                                    role="tab"
                                    aria-selected={isActive}
                                >
                                    <category.icon className="h-5 w-5 flex-shrink-0" />
                                    <span className="text-sm truncate">
                                        {formatCategoryName(category.name)}
                                    </span>
                                    {isActive && (
                                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-600 flex-shrink-0" />
                                    )}
                                </button>
                            );
                        })
                    )}
                </nav>
            </aside>

            {/* ===== MÓVIL (con STICKY) ===== */}
            <div
                className={cn(
                    "md:hidden w-full sticky top-0 z-50",
                    "bg-white/90 backdrop-blur-md border-b border-gray-200",
                    "py-2 px-2"
                )}
            >
                <div className="relative w-full flex items-center">
                    {/* Flecha izquierda */}
                    {showLeftArrow && (
                        <button
                            onClick={() => scroll("left")}
                            className="absolute left-0 z-10 bg-white border border-gray-200 shadow-lg rounded-full p-2 hover:bg-gray-50 focus:ring-2 focus:ring-purple-500 transition-all"
                            aria-label="Desplazar izquierda"
                        >
                            <ChevronLeft className="h-4 w-4 text-gray-600" />
                        </button>
                    )}

                    <div className="flex items-center gap-3 w-full px-8">
                        {/* Botón TODO fijo */}
                        {todoCategory && (
                            <button
                                onClick={handleTodoClick}
                                className={cn(
                                    "flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-all flex-shrink-0",
                                    categoriaActiva === ""
                                        ? "bg-purple-100 border-2 border-purple-600 shadow-md"
                                        : "bg-gray-100 border border-gray-200 shadow-sm hover:bg-gray-50"
                                )}
                                role="tab"
                                aria-selected={categoriaActiva === ""}
                            >
                                <todoCategory.icon
                                    className={cn(
                                        "h-5 w-5 mb-1",
                                        categoriaActiva === "" ? "text-purple-700" : "text-gray-600"
                                    )}
                                />
                                <span
                                    className={cn(
                                        "text-[10px] font-medium",
                                        categoriaActiva === "" ? "text-purple-700" : "text-gray-700"
                                    )}
                                >
                                    Todo
                                </span>
                            </button>
                        )}

                        {/* Slider */}
                        <div
                            ref={sliderRef}
                            className="flex gap-3 overflow-x-auto scrollbar-hide flex-1 scroll-smooth snap-x snap-mandatory"
                            onScroll={handleScroll}
                            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                        >
                            {otherCategories.map((category) => {
                                const isActive = categoriaActiva === category.name;
                                return (
                                    <button
                                        key={category.name}
                                        onClick={() => handleCategoryClick(category.name)}
                                        className={cn(
                                            "snap-start flex flex-col items-center justify-center w-16 h-16 flex-shrink-0 rounded-xl transition-all relative",
                                            isActive
                                                ? "bg-purple-100 border-2 border-purple-600 shadow-md"
                                                : "bg-gray-100 border border-gray-200 shadow-sm hover:shadow-md hover:bg-gray-50"
                                        )}
                                        role="tab"
                                        aria-selected={isActive}
                                    >
                                        <category.icon
                                            className={cn(
                                                "h-5 w-5 mb-1",
                                                isActive ? "text-purple-700" : "text-gray-600"
                                            )}
                                        />
                                        <span
                                            className={cn(
                                                "text-[10px] font-medium text-center leading-tight line-clamp-2",
                                                isActive ? "text-purple-700" : "text-gray-700"
                                            )}
                                        >
                                            {formatCategoryName(category.name)}
                                        </span>
                                        {isActive && (
                                            <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-purple-600 rounded-full" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Flecha derecha */}
                    {showRightArrow && (
                        <button
                            onClick={() => scroll("right")}
                            className="absolute right-0 z-10 bg-white border border-gray-200 shadow-lg rounded-full p-2 hover:bg-gray-50 focus:ring-2 focus:ring-purple-500 transition-all"
                            aria-label="Desplazar derecha"
                        >
                            <ChevronRight className="h-4 w-4 text-gray-600" />
                        </button>
                    )}
                </div>
            </div>
        </>
    );
};

export default CategorySlider;