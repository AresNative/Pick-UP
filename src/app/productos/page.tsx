import { PageProps } from "@/utils/types/page";
import { IonContent, IonList, IonButton } from "@ionic/react";
import Card from "./components/card";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useGetWithFiltersGeneralInIntelisisMutation } from "@/hooks/reducers/api_int";
import CategorySlider from "./components/categories";
/* import PromoBanner from "./components/banner"; */
import Badge from "@/components/badge";
import { formatValue } from "@/utils/constants/format-values";
import { getLocalStorageItem, removeFromLocalStorage } from "@/utils/functions/local-storage";
import { Producto } from "@/utils/types/page";
import { useAppDispatch, useAppSelector } from "@/hooks/selector";
import { RootState } from "@/hooks/store";
import { Sucursales } from "@/utils/data/sucursales";
import { clearAll } from "@/hooks/slices/app";
import { clearCart } from "@/hooks/slices/cart";
import { useHistory } from "react-router";
import { CategoryRow } from "./components/categories-section";
import { Loader2, AlertCircle, SearchX, Frown } from "lucide-react"; // ✨ nuevos íconos

// Tipo para la respuesta de la API
interface ApiResponse {
    totalRecords: number;
    totalPages: number;
    pageSize: number;
    page: number;
    data: any[];
}

// Estado de paginación/artículos de UNA categoría individual.
interface CategoryState {
    items: Producto[];
    page: number;
    hasMore: boolean;
    isLoading: boolean;
    total: number;
}

const PAGE_SIZE_POR_CATEGORIA = 5;

// Mismo JOIN que antes, parametrizado por categoría (o sin filtro, para
// descubrir qué categorías tienen artículos disponibles).
const tablaProductos = (grupoFiltro?: string) =>
    `art INNER JOIN ListaPreciosDUnidad AS lpu ON art.Articulo = lpu.Articulo AND art.Unidad = lpu.Unidad AND lpu.Lista = '(Precio Lista)' AND lpu.Precio > 0 ${grupoFiltro ? `AND art.Grupo = '${grupoFiltro}'` : ''} INNER JOIN ArtUnidad AS au ON art.Articulo = au.Articulo AND lpu.Unidad = au.Unidad INNER JOIN ArtDisponible AS ad on art.Articulo = ad.Articulo AND ad.DispMenosApartado > 0 AND ad.Almacen = 'ALMMAYO' AND (ad.DispMenosApartado / au.Factor) > 0 LEFT JOIN Oferta AS ofr ON ofr.Estatus = 'VIGENTE' AND ofr.FechaD <= GETDATE() AND ofr.FechaA >= GETDATE() AND ofr.SucursalDestino = '4' OR ofr.Estatus = 'VIGENTE' AND ofr.FechaD <= GETDATE() AND ofr.FechaA >= GETDATE() AND ofr.TodasSucursales = 'true' LEFT JOIN OfertaD AS ofrd ON ofr.ID = ofrd.ID AND  ofrd.Articulo = art.Articulo AND ofrd.Unidad = art.Unidad AND ofrd.Precio > 0`;

const mapApiItemToProducto = (item: any): Producto => ({
    id: item.Articulo + "-" + item.Unidad + "-" + item.Factor,
    articulo: item.Articulo || "Articulo",
    nombre: item.Descripcion1 || "Sin nombre",
    categoria: item.Grupo || "Sin categoría",
    unidad: item.Unidad || "Unidad",
    precio: item.Precio || 0,
    cantidad: item.Cantidad || 1,
    factor: item.Factor || 1,
    impuesto1: item.Impuesto1 || 0,
    impuesto2: item.Impuesto2 || 0,
    tipoImpuesto1: item.TipoImpuesto1 || 0,
    tipoImpuesto2: item.TipoImpuesto2 || 0,
    descuento: item.Porcentaje ? item.Precio - ((item.Porcentaje / 100) * item.Precio) : item.Descuento || 0,
});

const Productos: React.FC<PageProps> = ({ onScroll }: PageProps) => {
    const dispatch = useAppDispatch();
    const history = useHistory();
    const cat = useAppSelector((state: RootState) => state.filterData);
    const categoriaFiltro = cat?.key?.value || '';
    const sucursal = getLocalStorageItem("sucursal") ?? useAppSelector((state: any) => state.app.sucursal);

    // Estado local sincronizado con Redux
    const [selectedBranch, setSelectedBranch] = useState<(typeof Sucursales)[0] | null>(
        () => Sucursales.find(b => b.id === sucursal?.id) || null
    );
    const [getData] = useGetWithFiltersGeneralInIntelisisMutation();

    // Cambiar sucursal
    const changeBranch = async () => {
        await removeFromLocalStorage("sucursal");
        dispatch(clearAll());
        dispatch(clearCart());
        history.push('/#sucursales');
    };

    // Categorías visibles y su estado de paginación individual
    const [categorias, setCategorias] = useState<string[]>([]);
    const [categoriaData, setCategoriaData] = useState<Record<string, CategoryState>>({});
    const [isLoadingCategorias, setIsLoadingCategorias] = useState(true); // ← Único estado de carga global

    // Favoritos
    const [activeSection, setActiveSection] = useState<string | null>(null);
    const [favoriteItems, setFavoriteItems] = useState<Producto[]>([]);
    const [favoriteCount, setFavoriteCount] = useState(0);
    const isFavoritesSection = activeSection === 'Favoritos';

    const getFavoriteProducts = useCallback((): Producto[] => {
        try {
            const favorites = getLocalStorageItem("favoritos");
            const parsedFavorites = favorites ? JSON.parse(favorites) : [];
            setFavoriteCount(parsedFavorites.length);
            return parsedFavorites;
        } catch (e) {
            console.error('Error al leer favoritos del localStorage', e);
            setFavoriteCount(0);
            return [];
        }
    }, []);

    useEffect(() => {
        setFavoriteItems(getFavoriteProducts());
    }, [isFavoritesSection, getFavoriteProducts]);

    // Agrupamos los favoritos por categoría con la misma forma (CategoryState)
    const favoriteCategoryEntries = useMemo<[string, CategoryState][]>(() => {
        const groups = new Map<string, Producto[]>();
        favoriteItems.forEach((producto) => {
            const key = producto.categoria || "Sin categoría";
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(producto);
        });
        return Array.from(groups.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([nombre, items]) => [
                nombre,
                { items, page: 1, hasMore: false, isLoading: false, total: items.length },
            ]);
    }, [favoriteItems]);

    // ── Obtener lista de categorías (solo nombres) ──
    const fetchCategorias = useCallback(async () => {
        setIsLoadingCategorias(true);
        try {
            const result = await getData({
                table: tablaProductos(),
                pageSize: 100000,
                page: 1,
                filtros: {
                    Selects: [{ Key: "art.Grupo" }],
                    Order: [{ Key: "art.Grupo", Direction: "ASC" }],
                },
            });
            if ('data' in result && result.data) {
                const apiData: ApiResponse = result.data;
                const nombres = new Set<string>();
                (apiData.data || []).forEach((r: any) => {
                    if (r.Grupo) nombres.add(r.Grupo);
                });
                setCategorias(Array.from(nombres).sort());
            } else {
                setCategorias([]);
            }
        } catch (error) {
            console.error("Error obteniendo categorías:", error);
            setCategorias([]);
        } finally {
            setIsLoadingCategorias(false); // ← Siempre se desactiva la carga
        }
    }, [getData]);

    // ── Cargar una página (5 artículos) de UNA categoría específica ──
    const fetchCategoriaPage = useCallback(async (nombreCategoria: string, pagina: number) => {
        setCategoriaData(prev => ({
            ...prev,
            [nombreCategoria]: {
                ...(prev[nombreCategoria] ?? { items: [], page: 0, hasMore: true, total: 0 }),
                isLoading: true,
            },
        }));

        try {
            const result = await getData({
                table: tablaProductos(nombreCategoria),
                filtros: {
                    Selects: [
                        { Key: "art.Articulo" },
                        { Key: "art.Grupo" },
                        { Key: "art.Descripcion1" },
                        { Key: "art.Impuesto1" },
                        { Key: "art.Impuesto2" },
                        { Key: "art.TipoImpuesto1" },
                        { Key: "art.TipoImpuesto2" },
                        { Key: "lpu.Unidad" },
                        { Key: "lpu.Precio" },
                        { Key: "ofrd.Precio", Alias: "Descuento" },
                        { Key: "ofrd.Porcentaje" },
                        { Key: "au.Unidad", Alias: "UnidadFactor" },
                        { Key: "au.Factor" }
                    ],
                    Agregaciones: [
                        {
                            Key: "ad.DispMenosApartado",
                            Operation: "SUM",
                            Alias: "Cantidad"
                        }
                    ],
                    Order: [
                        { Key: "Descripcion1", Direction: "ASC" }
                    ],
                },
                pageSize: PAGE_SIZE_POR_CATEGORIA,
                page: pagina,
                signal: undefined,
            });

            if ('data' in result && result.data) {
                const apiData: ApiResponse = result.data;
                const nuevosItems = (apiData.data || []).map(mapApiItemToProducto);

                setCategoriaData(prev => {
                    const anterior = prev[nombreCategoria] ?? { items: [], page: 0, hasMore: true, total: 0 };
                    return {
                        ...prev,
                        [nombreCategoria]: {
                            items: pagina === 1 ? nuevosItems : [...anterior.items, ...nuevosItems],
                            page: pagina,
                            hasMore: pagina < (apiData.totalPages || 1),
                            total: apiData.totalRecords ?? anterior.total,
                            isLoading: false,
                        },
                    };
                });
            }
        } catch (error) {
            console.error(`❌ Error cargando artículos de "${nombreCategoria}":`, error);
            setCategoriaData(prev => ({
                ...prev,
                [nombreCategoria]: {
                    ...(prev[nombreCategoria] ?? { items: [], page: 0, total: 0 }),
                    isLoading: false,
                    hasMore: false,
                },
            }));
        }
    }, [getData]);
    const clearCategoryFilter = useCallback(() => {
        history.push('/productos');
        // También se podría usar window.location.reload() pero es menos suave.
    }, [history]);
    // ── Efecto principal: obtener categorías o usar filtro ──
    useEffect(() => {
        if (isFavoritesSection) {
            setIsLoadingCategorias(false);
            return;
        }
        setCategoriaData({});
        if (categoriaFiltro && categoriaFiltro !== 'TODO') {
            setCategorias([categoriaFiltro]);
            setIsLoadingCategorias(false); // No hay que cargar lista de categorías
        } else {
            fetchCategorias();
        }
    }, [categoriaFiltro, isFavoritesSection, fetchCategorias]);

    // ── Cargar primera página de cada categoría que aún no tenga datos ──
    useEffect(() => {
        if (isFavoritesSection) return;
        categorias.forEach((nombreCategoria) => {
            if (!categoriaData[nombreCategoria]) {
                fetchCategoriaPage(nombreCategoria, 1);
            }
        });
    }, [categorias, isFavoritesSection, categoriaData, fetchCategoriaPage]);

    // ── Handlers y derivados ──
    const handleSectionChange = useCallback((section: string) => {
        setActiveSection(prev => (prev === section ? null : section));
    }, []);

    const categoriaEntries = useMemo<[string, CategoryState][]>(() => (
        categorias.map((nombreCategoria) => [
            nombreCategoria,
            categoriaData[nombreCategoria] ?? { items: [], page: 0, hasMore: true, isLoading: true, total: 0 },
        ])
    ), [categorias, categoriaData]);

    const totalProductos = useMemo(
        () => categoriaEntries.reduce((suma, [, data]) => suma + (data.total || 0), 0),
        [categoriaEntries]
    );

    const entriesAMostrar = isFavoritesSection ? favoriteCategoryEntries : categoriaEntries;
    const sinResultados = isFavoritesSection
        ? favoriteItems.length <= 0
        : !isLoadingCategorias && entriesAMostrar.length <= 0;

    return (
        <IonContent
            fullscreen
            scrollEvents
            onIonScroll={(e) => {
                const isScrolled = e.detail.scrollTop > 20;
                onScroll?.(isScrolled);
            }}
            aria-live="polite"
            aria-busy={isLoadingCategorias}
        >
            <section className="px-4 py-4 mx-auto md:mb-0 mb-16">
                <div className="flex flex-col md:flex-row md:gap-6">
                    <CategorySlider />

                    <div className="flex-1 min-w-0">
                        {/* Sticky de filtros (sin cambios) */}
                        <section className="sticky top-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-2 overflow-x-auto sm:overflow-visible scrollbar-hide z-50 bg-white/70 dark:bg-black/70 py-3 px-4 sm:py-2 sm:px-2 my-4 rounded-lg backdrop-blur-md border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
                                {[
                                    { key: null, label: "Productos", count: totalProductos },
                                    { key: 'Favoritos', label: "Favoritos", count: favoriteCount }
                                ].map((section) => (
                                    <button
                                        key={section.key || 'ofertas'}
                                        onClick={() => handleSectionChange(section.key!)}
                                        className="flex items-center gap-2 h-10 cursor-pointer focus:outline-none transition-opacity hover:opacity-90 flex-shrink-0"
                                    >
                                        <Badge
                                            color={activeSection === section.key ? "purple" : "gray"}
                                            text={`${section.label} ${section.count > 0 ? `(${formatValue(section.count, "number")})` : ''}`}
                                        />
                                    </button>
                                ))}
                                <IonButton
                                    fill="clear"
                                    routerLink="/ofertas"
                                    routerDirection="none"
                                    className="custom flex items-center gap-2 cursor-pointer focus:outline-none transition-opacity hover:opacity-90 flex-shrink-0"
                                >
                                    <Badge color="gray" text="Solo ofertas" />
                                </IonButton>
                            </div>

                            <div className="flex items-center justify-end gap-4 flex-shrink-0 sm:ml-auto">
                                {selectedBranch && (
                                    <>
                                        <div className="sm:flex items-center">
                                            <span className="text-sm font-medium text-purple-800 dark:text-purple-300">
                                                Almacén: <strong className="text-gray-700 dark:text-gray-300 ml-1">{selectedBranch.name}</strong>
                                            </span>
                                        </div>
                                        <button
                                            onClick={changeBranch}
                                            className="text-xs sm:text-sm text-purple-700 dark:text-purple-400 underline hover:text-purple-900 dark:hover:text-purple-300 transition-colors whitespace-nowrap"
                                        >
                                            Cambiar
                                        </button>
                                    </>
                                )}
                            </div>
                        </section>

                        {/* ✅ Spinner de carga inicial con Lucide */}
                        {isLoadingCategorias && (
                            <div
                                className="flex flex-col items-center justify-center py-20"
                                role="status"
                                aria-label="Cargando categorías"
                            >
                                <Loader2 className="w-12 h-12 text-purple-600 animate-spin" />
                                <p className="mt-4 text-gray-600 dark:text-gray-300">
                                    Cargando categorías...
                                </p>
                            </div>
                        )}

                        {/* Lista de productos (solo si no está cargando la lista de categorías) */}
                        {!isLoadingCategorias && (
                            <>
                                {sinResultados ? (
                                    // ── ✅ NUEVA SECCIÓN: Productos no encontrados ──
                                    <div
                                        className="flex flex-col items-center justify-center py-16 px-4 text-center"
                                        role="status"
                                        aria-live="polite"
                                    >
                                        {isFavoritesSection ? (
                                            <>
                                                <Frown className="w-16 h-16 text-gray-400 dark:text-gray-500 mb-4" />
                                                <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300">
                                                    No tienes favoritos guardados
                                                </h3>
                                                <p className="mt-2 text-gray-500 dark:text-gray-400 max-w-sm">
                                                    Agrega productos a tu lista de favoritos para verlos aquí.
                                                </p>
                                                <button
                                                    onClick={() => handleSectionChange(null as any)} // Vuelve a "Productos"
                                                    className="mt-6 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                                                >
                                                    Explorar productos
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <SearchX className="w-16 h-16 text-gray-400 dark:text-gray-500 mb-4" />
                                                <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300">
                                                    No encontramos productos
                                                </h3>
                                                <p className="mt-2 text-gray-500 dark:text-gray-400 max-w-sm">
                                                    {categoriaFiltro && categoriaFiltro !== 'TODO'
                                                        ? `No hay productos disponibles en la categoría "${categoriaFiltro}".`
                                                        : 'No hay productos disponibles en este momento.'}
                                                </p>
                                                {categoriaFiltro && categoriaFiltro !== 'TODO' && (
                                                    <button
                                                        onClick={clearCategoryFilter}
                                                        className="mt-6 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                                                    >
                                                        Ver todas las categorías
                                                    </button>
                                                )}
                                                {!categoriaFiltro && (
                                                    <button
                                                        onClick={() => window.location.reload()}
                                                        className="mt-6 px-6 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg transition-colors"
                                                    >
                                                        Recargar página
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    // ── Lista normal de categorías con productos ──
                                    <IonList className="bg-transparent" role="list">
                                        {entriesAMostrar.map(([nombreCategoria, data]) => (
                                            <CategoryRow
                                                key={nombreCategoria}
                                                title={nombreCategoria}
                                                items={data.items}
                                                hasMore={data.hasMore}
                                                isLoading={data.isLoading}
                                                onLoadMore={() => fetchCategoriaPage(nombreCategoria, data.page + 1)}
                                                renderItem={(producto, index) => (
                                                    <Card key={`${producto.id}-${index}`} producto={producto} />
                                                )}
                                                showSkeleton={data.isLoading && data.items.length === 0}
                                            />
                                        ))}
                                    </IonList>
                                )}
                            </>
                        )}

                        {/* ✅ Estado de vacío con ícono */}
                        {!isLoadingCategorias && sinResultados && (
                            <div
                                className="text-center py-8"
                                role="status"
                                aria-live="polite"
                            >
                                {isFavoritesSection ? (
                                    <>
                                        <AlertCircle className="w-10 h-10 mx-auto text-gray-400" />
                                        <p className="mt-2 text-gray-500">No tienes favoritos guardados</p>
                                    </>
                                ) : (
                                    <>
                                        <AlertCircle className="w-10 h-10 mx-auto text-gray-400" />
                                        <p className="mt-2 text-gray-500">No se encontraron productos</p>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </IonContent>
    );
};

export default Productos;