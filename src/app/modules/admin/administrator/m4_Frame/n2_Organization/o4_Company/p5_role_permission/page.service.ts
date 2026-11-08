import {
    HttpClient,
    HttpRequest,
    HttpHandler,
    HttpEvent,
    HttpHeaders,
    HttpInterceptor,
} from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { Injectable } from '@angular/core';
import {
    BehaviorSubject,
    filter,
    map,
    Observable,
    of,
    switchMap,
    take,
    tap,
    throwError,
} from 'rxjs';
import {
    AssetItem,
    Store,
    AssetType,
    Chat,
    // PermissionProductDetailOSM,
    Pagination,
    PositionProduct,
    StoreType,
    AssetSize,
    Supplier,
    Division,
} from './page.types';
import { environment } from 'environments/environment';
import { AssetCategory } from 'app/shared/asset-category';
import { DataTablesResponse } from 'app/shared/datatable.types';
// import { UserDetail } from '../user/user.types';
const token = localStorage.getItem('accessToken') || null;
@Injectable({
    providedIn: 'root',
})
export class Service {
    // Private
    private _pagination: BehaviorSubject<Pagination | null> =
        new BehaviorSubject(null);
    private _product: BehaviorSubject<PositionProduct | null> =
        new BehaviorSubject(null);
    private _products: BehaviorSubject<PositionProduct[] | null> =
        new BehaviorSubject(null);
    private _product_osm: BehaviorSubject<PositionProduct | null> =
        new BehaviorSubject(null);
    private _products_osm: BehaviorSubject<PositionProduct[] | null> =
        new BehaviorSubject(null);
    private _chat: BehaviorSubject<Chat> = new BehaviorSubject(null);
    private _chats: BehaviorSubject<Chat[]> = new BehaviorSubject(null);
    private _asset_types: BehaviorSubject<AssetType[] | null> =
        new BehaviorSubject(null);
    // private _suppliers: BehaviorSubject<UserDetail[] | null> = new BehaviorSubject(null);
    // private _two_approvers: BehaviorSubject<UserDetail[] | null> = new BehaviorSubject(null);
    private _store_types: BehaviorSubject<StoreType[] | null> =
        new BehaviorSubject(null);
    private _stores: BehaviorSubject<Store[] | null> = new BehaviorSubject(
        null
    );
    private _seasons: BehaviorSubject<any[] | null> = new BehaviorSubject(null);
    private _asset_sizes: BehaviorSubject<any[] | null> = new BehaviorSubject(
        null
    );
    private _divisions: BehaviorSubject<any[] | null> = new BehaviorSubject(
        null
    );
    private _materials: BehaviorSubject<any[] | null> = new BehaviorSubject(
        null
    );
    /**
     * Constructor
     */
    constructor(private _httpClient: HttpClient) {}

    httpOptionsFormdata = {
        headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
    };

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    /**
     * Getter for pagination
     */
    get pagination$(): Observable<Pagination> {
        return this._pagination.asObservable();
    }

    /**
     * Getter for product
     */
    get product$(): Observable<PositionProduct> {
        return this._product.asObservable();
    }

    /**
     * Getter for products
     */
    get products$(): Observable<PositionProduct[]> {
        return this._products.asObservable();
    }

    /**
     * Getter for product
     */
    get product_osm$(): Observable<PositionProduct> {
        return this._product_osm.asObservable();
    }

    /**
     * Getter for products
     */
    get products_osm$(): Observable<any[]> {
        return this._products_osm.asObservable();
    }

    /**
     * Getter for chat
     */
    get chat$(): Observable<Chat> {
        return this._chat.asObservable();
    }

    /**
     * Getter for chats
     */
    get chats$(): Observable<Chat[]> {
        return this._chats.asObservable();
    }

    /**
     * Getter for tags
     */
    // get suppliers$(): Observable<UserDetail[]> {
    //     return this._suppliers.asObservable();
    // }

    // /**
    //     * Getter for tags
    //     */
    // get two_approvers$(): Observable<UserDetail[]> {
    //     return this._two_approvers.asObservable();
    // }

    /**
     * Getter for asset type
     */
    get asset_types$(): Observable<AssetType[]> {
        return this._asset_types.asObservable();
    }

    /**
     * Getter for store type
     */
    get store_types$(): Observable<StoreType[]> {
        return this._store_types.asObservable();
    }

    /**
     * Getter for store type
     */
    get stores$(): Observable<Store[]> {
        return this._stores.asObservable();
    }

    /**
     * Getter for season
     */
    get seasons$(): Observable<any[]> {
        return this._seasons.asObservable();
    }

    /**
     * Getter for division
     */
    get divisions$(): Observable<any[]> {
        return this._divisions.asObservable();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Get chats
     */
    getChat(id: string): Observable<any> {
        return this._httpClient
            .get<Chat>('api/apps/chat/chat', { params: { id } })
            .pipe(
                map((chat) => {
                    // Update the chat
                    this._chat.next(chat);

                    // Return the chat
                    return chat;
                }),
                switchMap((chat) => {
                    if (!chat) {
                        return throwError(
                            'Could not found chat with id of ' + id + '!'
                        );
                    }

                    return of(chat);
                })
            );
    }

    /**
     * Get chat
     *
     * @param id
     */
    getChatById(id: string): Observable<any> {
        return this._httpClient
            .get<Chat>('api/apps/chat/chat', { params: { id } })
            .pipe(
                map((chat) => {
                    // Update the chat
                    this._chat.next(chat);

                    // Return the chat
                    return chat;
                }),
                switchMap((chat) => {
                    if (!chat) {
                        return throwError(
                            'Could not found chat with id of ' + id + '!'
                        );
                    }

                    return of(chat);
                })
            );
    }

    /**
     * Get comment
     */

    getComments(assetId: any): Observable<any[]> {
        return this._httpClient
            .post<any[]>(
                environment.API_URL + 'api/assets/get_asset_by_brief',
                {
                    brief_id: assetId,
                },
                this.httpOptionsFormdata
            )
            .pipe(
                take(1),
                map((products) => {
                    return products;
                }),
                switchMap((product) => {
                    if (!product) {
                        return throwError(
                            'Could not found product with id of !'
                        );
                    }

                    return of(product);
                })
            );
    }

    /**
     * Get products
     *
     *
     * @param page
     * @param size
     * @param sort
     * @param order
     * @param search
     */
    getProducts(
        page: number = 0,
        size: number = 10,
        sort: string = 'id',
        order: 'asc' | 'desc' | '' = 'asc',
        search: string = '',
        assetType: string = '',
        supplierId: string = '',
        _2nd: string = ''
    ): Observable<{ meta: Pagination; data: PositionProduct[] }> {
        let searchParams: any = [];

        searchParams = {
            'pagination[page]': '' + page,
            'pagination[pageSize]': '' + size,
            populate: '*',
            'sort[0]': 'brief_date:desc',
        };

        if (sort != '' && sort != null) {
            searchParams = {
                ...searchParams,
                'sort[0]': `${sort}:${order}`,
            };
        }

        if (assetType != '' && assetType != null) {
            searchParams = {
                ...searchParams,
                'filters[$and][0][asset_type]': assetType,
            };
        }

        if (supplierId != '' && supplierId != null) {
            searchParams = {
                ...searchParams,
                'filters[$or][1][translation_supplier_id]': supplierId,
                'filters[$or][2][artwork_supplier_id]': supplierId,
                'filters[$or][3][production_supplier_id]': supplierId,
            };
        }

        if (search) {
            searchParams = {
                ...searchParams,
                'filters[$or][4][order_name][$containsi]': search,
                'filters[$or][5][assets][asset_code][$containsi]': search,
                'filters[$or][6][season][$containsi]': search,
            };
        }

        if (_2nd != '' && _2nd != null) {
            searchParams = {
                ...searchParams,
                'filters[$or][7][two_approver]': _2nd,
            };
        }

        return this._httpClient
            .get<{ meta: Pagination; data: PositionProduct[] }>(
                environment.API_URL + 'api/briefs',
                {
                    params: searchParams,
                    headers: new HttpHeaders({
                        Authorization: `Bearer ${token}`,
                    }),
                }
            )
            .pipe(
                tap((response) => {
                    this._pagination.next({
                        length: response.meta.pagination.total,
                        size: response.meta.pagination.pageSize,
                        page: response.meta.pagination.page - 1,
                        lastPage: 0,
                        startIndex: 0,
                        endIndex: 0,
                        pagination: {
                            page: response.meta.pagination.page,
                            pageCount: response.meta.pagination.pageCount,
                            pageSize: response.meta.pagination.pageSize,
                            total: response.meta.pagination.total,
                        },
                    });
                    this._products.next(response.data);
                })
            );
    }

    getProductsND(
        page: number = 0,
        size: number = 10,
        sort: string = 'id',
        order: 'asc' | 'desc' | '' = 'asc',
        search: string = '',
        assetType: string = '',
        supplierId: string = '',
        _2nd: string = ''
    ): Observable<{ meta: Pagination; data: PositionProduct[] }> {
        let searchParams: any = [];

        searchParams = {
            'pagination[page]': '' + page,
            'pagination[pageSize]': '' + size,
            populate: '*',
            'sort[0]': 'brief_date:desc',
        };

        if (sort != '' && sort != null) {
            searchParams = {
                ...searchParams,
                'sort[0]': `${sort}:${order}`,
            };
        }

        if (assetType != '' && assetType != null) {
            searchParams = {
                ...searchParams,
                'filters[$and][0][asset_type]': assetType,
            };
        }

        if (supplierId != '' && supplierId != null) {
            searchParams = {
                ...searchParams,
                'filters[$or][1][translation_supplier_id]': supplierId,
                'filters[$or][2][artwork_supplier_id]': supplierId,
                'filters[$or][3][production_supplier_id]': supplierId,
            };
        }

        if (search) {
            searchParams = {
                ...searchParams,
                'filters[$or][4][order_name][$containsi]': search,
                'filters[$or][5][assets][asset_code][$containsi]': search,
                'filters[$or][6][season][$containsi]': search,
            };
        }

        if (_2nd != '' && _2nd != null) {
            searchParams = {
                ...searchParams,
                'filters[brief_osm_stores][two_approver]': _2nd,
                'filters[$and][7][status][$ne]': 'draft',
            };
        }

        return this._httpClient
            .get<{ meta: Pagination; data: PositionProduct[] }>(
                environment.API_URL + 'api/brief-osms',
                {
                    params: searchParams,
                    headers: new HttpHeaders({
                        Authorization: `Bearer ${token}`,
                    }),
                }
            )
            .pipe(
                tap((response) => {
                    this._pagination.next({
                        length: response.meta.pagination.total,
                        size: response.meta.pagination.pageSize,
                        page: response.meta.pagination.page - 1,
                        lastPage: 0,
                        startIndex: 0,
                        endIndex: 0,
                        pagination: {
                            page: response.meta.pagination.page,
                            pageCount: response.meta.pagination.pageCount,
                            pageSize: response.meta.pagination.pageSize,
                            total: response.meta.pagination.total,
                        },
                    });
                    this._products_osm.next(response.data);
                })
            );
    }

    getProductsOsm(
        page: number = 0,
        size: number = 10,
        sort: string = 'updatedAt',
        order: 'asc' | 'desc' | '' = 'desc',
        search: string = ''
    ): Observable<{ meta: Pagination; data: PositionProduct[] }> {
        let searchParams: any = [];

        searchParams = {
            'pagination[page]': '' + page,
            'pagination[pageSize]': '' + size,
            'populate[0]': 'brief_osm_stores.store',
            'populate[1]': 'artwork_supplier_id',
            'populate[2]': 'production_supplier_id',
            'populate[3]': 'brief_files',
            'sort[0]': 'brief_date:desc',
        };

        if (sort != '' && sort != null) {
            searchParams = {
                ...searchParams,
                'sort[0]': `${sort}:${order}`,
            };
        }

        // if (assetType != '' && assetType != null) {
        //     searchParams = {
        //         ...searchParams,
        //         'filters[$and][0][asset_type]': assetType,
        //     }
        // }

        // if (supplierId != '' && supplierId != null) {
        //     searchParams = {
        //         ...searchParams,
        //         'filters[$or][1][translation_supplier_id]': supplierId,
        //         'filters[$or][2][artwork_supplier_id]': supplierId,
        //         'filters[$or][3][production_supplier_id]': supplierId,
        //     }
        // }

        if (search) {
            searchParams = {
                ...searchParams,
                'filters[$or][0][name][$containsi]': search,
                'filters[$or][1][brief_osm_stores][store][name][$containsi]':
                    search,
                'filters[$or][2][brief_osm_stores][store][short_name][$containsi]':
                    search,
                // 'filters[$or][5][assets][asset_code][$containsi]': search,
                // 'filters[$or][6][season][$containsi]': search,
            };
        }

        return this._httpClient
            .get<{ meta: Pagination; data: PositionProduct[] }>(
                environment.API_URL + 'api/brief-osms',
                {
                    params: searchParams,
                    headers: new HttpHeaders({
                        Authorization: `Bearer ${token}`,
                    }),
                }
            )
            .pipe(
                tap((response) => {
                    this._pagination.next({
                        length: response.meta.pagination.total,
                        size: response.meta.pagination.pageSize,
                        page: response.meta.pagination.page - 1,
                        lastPage: 0,
                        startIndex: 0,
                        endIndex: 0,
                        pagination: {
                            page: response.meta.pagination.page,
                            pageCount: response.meta.pagination.pageCount,
                            pageSize: response.meta.pagination.pageSize,
                            total: response.meta.pagination.total,
                        },
                    });
                    this._products_osm.next(response.data);
                })
            );
    }

    /**
     * Get product by id
     */
    getProductById(id: string): Observable<any> {
        // this.getProducts();
        return this._httpClient
            .get<any>(environment.API_URL + 'api/briefs/' + id, {
                headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
                params: {
                    'populate[0]': 'translation_supplier_id',
                    'populate[1]': 'artwork_supplier_id',
                    'populate[2]': 'production_supplier_id',
                    'populate[3]': 'assets.asset_artworks.artwork_file',
                    'populate[4]': 'translation_file',
                    'populate[5]': 'brief_file',
                    'populate[6]': 'assets.item',
                    'populate[7]': 'asset_type.asset_sizes',
                    'populate[8]': 'brief_translation_files.file',
                    'populate[9]': 'assets.asset_comments.user_id',
                    'populate[10]': 'assets.asset_comments.file',
                    'populate[11]': 'assets.division',
                    'populate[12]': 'assets.store_type',
                    'populate[13]': 'assets.asset_size',
                },
            })
            .pipe(
                take(1),
                map((products) => {
                    // Find the product
                    // const product = this._products_prod/.;
                    // products[0].data;
                    // var thumbnail = "";
                    // var images = [];

                    // thumbnail = 'assets/images/artworks/artwork-1.png';
                    // images = [
                    //     'assets/images/artworks/artwork-1.png',
                    //     'assets/images/artworks/artwork-1.png',
                    //     'assets/images/artworks/artwork-1.png'
                    // ];

                    // products.data.attributes.thumbnail = thumbnail;
                    // products.data.attributes.images = images;

                    // // // Update the product
                    this._product.next(products.data);

                    // // Return the product
                    return products.data;
                }),
                switchMap((product) => {
                    // if (!product) {
                    //     return throwError('Could not found product with id of ' + id + '!');
                    // }

                    return of(product);
                })
            );
    }

    /**
     * Get product by id
     */

    /**
     * Create product
     */
    createProduct(): Observable<PositionProduct> {
        return this.products$.pipe(
            take(1),
            switchMap((products) =>
                this._httpClient
                    .post<PositionProduct>(
                        'api/marketing/brief-plan/product',
                        {}
                    )
                    .pipe(
                        map((newProduct) => {
                            // Update the products with the new product
                            this._products.next([newProduct, ...products]);

                            // Return the new product
                            return newProduct;
                        })
                    )
            )
        );
    }

    getCommentsOSM(assetId: any): Observable<any[]> {
        return this._httpClient
            .get<any[]>(
                environment.API_URL +
                    'api/brief-osm-comment-by-brief-osm/' +
                    assetId,
                this.httpOptionsFormdata
            )
            .pipe(
                take(1),
                map((products) => {
                    return products;
                }),
                switchMap((product) => {
                    if (!product) {
                        return throwError(
                            'Could not found product with id of !'
                        );
                    }

                    return of(product);
                })
            );
    }

    approveArtwork(data: any, briefId): Observable<any> {
        return this._httpClient
            .post(
                environment.API_URL +
                    'api/briefs/' +
                    briefId +
                    '/approve_asset',
                data,
                this.httpOptionsFormdata
            )
            .pipe(
                switchMap((response: any) => {
                    // Return a new observable with the response
                    return of(response);
                })
            );
    }

    approveArtworkAll(data: any, briefId): Observable<any> {
        return this._httpClient
            .post(
                environment.API_URL +
                    'api/briefs/' +
                    briefId +
                    '/approve_asset_all',
                data,
                this.httpOptionsFormdata
            )
            .pipe(
                switchMap((response: any) => {
                    // Return a new observable with the response
                    return of(response);
                })
            );
    }

    approveArtworkOSM(data: any, briefId): Observable<any> {
        return this._httpClient
            .post(
                environment.API_URL +
                    'api/briefs-osm-store-file/' +
                    briefId +
                    '/approve',
                data,
                this.httpOptionsFormdata
            )
            .pipe(
                switchMap((response: any) => {
                    // Return a new observable with the response
                    return of(response);
                })
            );
    }

    deleteCategory(id: any): Observable<any> {
        return this._httpClient.delete<any>(
            environment.API_URL + '/api/category_product/' + id,
            { headers: this.httpOptionsFormdata.headers }
        );
    }

    approveArtworkOSMND(data: any, briefId): Observable<any> {
        return this._httpClient
            .post(
                environment.API_URL +
                    'api/brief-osm-store/' +
                    briefId +
                    '/lanlord-confirm',
                data,
                this.httpOptionsFormdata
            )
            .pipe(
                switchMap((response: any) => {
                    // Return a new observable with the response
                    return of(response);
                })
            );
    }

    // getSuppliers(): Observable<any[]> {
    //     return this._httpClient.get<any[]>(environment.API_URL + 'api/users').pipe(
    //         tap((suppliers) => {
    //             this._suppliers.next(suppliers);
    //         })
    //     );
    // }

    comment(data: any): Observable<any> {
        return this._httpClient
            .post(
                environment.API_URL + 'api/asset-comments',
                data,
                this.httpOptionsFormdata
            )
            .pipe(
                switchMap((response: any) => {
                    // Return a new observable with the response
                    return of(response);
                })
            );
    }

    /**
     * Update product
     *
     * @param id
     * @param product
     */
    updateProduct(
        id: string,
        product: PositionProduct
    ): Observable<PositionProduct> {
        return this.products$.pipe(
            take(1),
            switchMap((products) =>
                this._httpClient
                    .patch<PositionProduct>(
                        'api/marketing/brief-plan/product',
                        {
                            id,
                            product,
                        }
                    )
                    .pipe(
                        map((updatedProduct) => {
                            // Find the index of the updated product
                            const index = products.findIndex(
                                (item) => item.id === id
                            );

                            // Update the product
                            products[index] = updatedProduct;

                            // Update the products
                            this._products.next(products);

                            // Return the updated product
                            return updatedProduct;
                        }),
                        switchMap((updatedProduct) =>
                            this.product$.pipe(
                                take(1),
                                filter((item) => item && item.id === id),
                                tap(() => {
                                    // Update the product if it's selected
                                    this._product.next(updatedProduct);

                                    // Return the updated product
                                    return updatedProduct;
                                })
                            )
                        )
                    )
            )
        );
    }
    getCodePage(dataTablesParameters: any): Observable<DataTablesResponse> {
        return this._httpClient.post(environment.API_URL + '/api/floor_page', dataTablesParameters, this.httpOptionsFormdata).pipe(
          switchMap((response: any) => {
            return of(response.data);
          })
        );
      }

    createUsages(data: any): Observable<any> {
        return this._httpClient
            .post(
                environment.API_URL + '/api/vehicle/usages/add',
                data,
                this.httpOptionsFormdata
            )
            .pipe(
                switchMap((response: any) => {
                    // Return a new observable with the response
                    return of(response);
                })
            );
    }
    getCouponType(): Observable<any[]> {
        return this._httpClient.post<any[]>(environment.API_URL + '/api/get_gift_voucher',{status:1},this.httpOptionsFormdata).pipe(
          tap((meterial) => {
            this._materials.next(meterial);
          })
        );
      }
    deleteCoupon(id: any): Observable<any> {
        return this._httpClient.delete<any>(
            environment.API_URL + '/api/gift_voucher_code/' + id,
            { headers: this.httpOptionsFormdata.headers }
        );
    }
    // delete(id: any): Observable<any> {
    //     return this._httpClient.delete<any>(
    //         environment.API_URL + '/api/gift_voucher/' + id,
    //         { headers: this.httpOptionsFormdata.headers }
    //     );
    // }

    commentOSM(data: any): Observable<any> {
        return this._httpClient
            .post(
                environment.API_URL + 'api/brief-osm-comment',
                data,
                this.httpOptionsFormdata
            )
            .pipe(
                switchMap((response: any) => {
                    // Return a new observable with the response
                    return of(response);
                })
            );
    }

    /**
     * Delete the product
     *
     * @param id
     */
    deleteProduct(id: string): Observable<boolean> {
        return this.products$.pipe(
            take(1),
            switchMap((products) =>
                this._httpClient
                    .delete('api/marketing/brief-plan/product', {
                        params: { id },
                    })
                    .pipe(
                        map((isDeleted: boolean) => {
                            // Find the index of the deleted product
                            const index = products.findIndex(
                                (item) => item.id === id
                            );

                            // Delete the product
                            products.splice(index, 1);

                            // Update the products
                            this._products.next(products);

                            // Return the deleted status
                            return isDeleted;
                        })
                    )
            )
        );
    }

    /**
     * Get Asset Type
     */
    getSeason(): Observable<any[]> {
        return this._httpClient
            .get<any[]>(environment.API_URL + 'api/item/seasons')
            .pipe(
                tap((seasons) => {
                    this._seasons.next(seasons);
                })
            );
    }

    /**
     * Get Asset Type
     */
    getAssetType(): Observable<AssetType[]> {
        return this._httpClient
            .get<AssetType[]>(environment.API_URL + 'api/asset-type/all')
            .pipe(
                tap((asset_types) => {
                    this._asset_types.next(asset_types);
                })
            );
    }

    /**
     * Get Asset Type
     */
    getAssetSizes(asset_type: any): Observable<AssetSize[]> {
        return this._httpClient
            .post<AssetSize[]>(
                environment.API_URL + 'api/get_asset_size_by_asset_type',
                {
                    asset_type_id: asset_type,
                }
            )
            .pipe(
                tap((asset_sizes) => {
                    this._asset_sizes.next(asset_sizes);
                })
            );
    }

    /**
     * Create product
     */
    createProductOSM(brief: any): Observable<any> {
        // Throw error, if the user is already logged in
        //  if (this._authenticated) {
        //     return throwError('User is already logged in.');
        // }

        return this._httpClient
            .post(
                environment.API_URL + 'api/briefs-osm/create',
                brief,
                this.httpOptionsFormdata
            )
            .pipe(
                switchMap((response: any) => {
                    // Return a new observable with the response
                    return of(response);
                })
            );
    }

    /**
     * update product
     */
    updateProductOSM(brief: any, osm: any): Observable<any> {
        // Throw error, if the user is already logged in
        //  if (this._authenticated) {
        //     return throwError('User is already logged in.');
        // }

        return this._httpClient
            .put(
                environment.API_URL +
                    'api/briefs-osm/' +
                    osm +
                    '/update?populate[0]=brief_osm_stores.store&populate[1]=artwork_supplier_id&populate[2]=production_supplier_id&populate[3]=brief_files',
                brief,
                this.httpOptionsFormdata
            )
            .pipe(
                switchMap((response: any) => {
                    // Return a new observable with the response
                    return of(response);
                })
            );
    }

    /**
     * Get Asset Type
     */
    getDivision(): Observable<Division[]> {
        return this._httpClient.get<any[]>(
            environment.API_URL + 'api/division/dropdown'
        );
    }

    /**
     * Get store Type
     */
    getStoreType(): Observable<StoreType[]> {
        return this._httpClient
            .get<StoreType[]>(
                environment.API_URL + 'api/store-types?populate=*'
            )
            .pipe(
                tap((store_types) => {
                    this._store_types.next(store_types);
                })
            );
    }

    getStore(): Observable<Store[]> {
        return this._httpClient
            .get<Store[]>(
                environment.API_URL +
                    'api/store_list?pagination[page]=1&pagination[pageSize]=9999&sort[0]=store_type.id'
            )
            .pipe(
                tap((stores) => {
                    this._stores.next(stores);
                })
            );
    }

    uploadFile(item: FormData): Observable<any> {
        return this._httpClient
            .post<any>(
                environment.API_URL + 'api/upload',
                item,
                this.httpOptionsFormdata
            )
            .pipe(catchError(this.handlerError));
    }

    uploadArtwork(artwork: any, briefId): Observable<any> {
        return this.products$.pipe(
            take(1),
            switchMap((products) =>
                this._httpClient
                    .post<any>(
                        environment.API_URL +
                            'api/briefs/' +
                            briefId +
                            '/upload_artworks',
                        artwork,
                        this.httpOptionsFormdata
                    )
                    .pipe(
                        map((newProduct) => {
                            // Update the products with the new product
                            this._products.next([newProduct, ...products]);

                            // Return the new product
                            return newProduct;
                        })
                    )
            )
        );
    }

    getLastNumber(req: any): Observable<any> {
        return this._httpClient.post<any>(
            environment.API_URL + 'api/assets/get_last_number',
            req,
            this.httpOptionsFormdata
        );
    }

    getAssetItems(req: any): Observable<AssetItem> {
        // return this._httpClient.get<AssetItem>(environment.API_URL + 'api/items?filters[size_for_ec][$eq]=' + req.size_for_ec + '&filters[store_type][$eq]=' + req.store_type + '&filters[season][$eq]=' + req.season + '&filters[division][$eq]=' + req.division + '&pagination[limit]=1', this.httpOptionsFormdata).pipe(
        return this._httpClient
            .get<AssetItem>(
                environment.API_URL +
                    'api/items?filters[season][$eq]=' +
                    req.season +
                    '&filters[division][$eq]=' +
                    req.division +
                    '&pagination[limit]=1',
                this.httpOptionsFormdata
            )
            .pipe(
                take(1),
                map((products) => {
                    return products;
                }),
                switchMap((product) => {
                    if (!product) {
                        return throwError(
                            'Could not found product with id of !'
                        );
                    }

                    return of(product);
                })
            );
    }

    getAssetCategory(): Observable<AssetCategory[]> {
        return this._httpClient
            .get<AssetCategory[]>(
                environment.API_URL +
                    'api/asset-categories?populate=*&pagination[withCount]=false',
                this.httpOptionsFormdata
            )
            .pipe();
    }

    handlerError(error): Observable<never> {
        let errorMessage = 'Error unknown';
        if (error) {
            errorMessage = `${error.error.message}`;
        }
        // window.alert(errorMessage);
        return throwError(errorMessage);
    }

    getBriefs(
        page: number = 0,
        size: number = 10,
        sort: string = 'id',
        order: 'asc' | 'desc' | '' = 'asc',
        search: string = '',
        supplierId: string = ''
    ): Observable<any> {
        let searchParams: any = [];

        searchParams = {
            'pagination[page]': '' + page,
            'pagination[pageSize]': '' + size,
            fields: '*',
            populate: '*',
            'sort[0]': 'brief_date:desc',
        };

        if (sort != '' && sort != null) {
            searchParams['sort[1]'] = `${sort}:${order}`;
        }

        if (supplierId != '') {
            searchParams['filters[$or][0][translation_supplier_id]'] =
                supplierId;
            searchParams['filters[$or][1][artwork_supplier_id]'] = supplierId;
            searchParams['filters[$or][2][production_supplier_id]'] =
                supplierId;
        }

        if (search) {
            searchParams['filters[order_name][$containsi]'] = search;
        }

        return this._httpClient
            .get<{ meta: Pagination; data: PositionProduct[] }>(
                environment.API_URL + 'api/briefs',
                {
                    params: searchParams,
                    headers: new HttpHeaders({
                        Authorization: `Bearer ${token}`,
                    }),
                }
            )
            .pipe(
                tap((response) => {
                    this._pagination.next({
                        length: response.meta.pagination.total,
                        size: response.meta.pagination.pageSize,
                        page: response.meta.pagination.page - 1,
                        lastPage: 0,
                        startIndex: 0,
                        endIndex: 0,
                        pagination: {
                            page: response.meta.pagination.page,
                            pageCount: response.meta.pagination.pageCount,
                            pageSize: response.meta.pagination.pageSize,
                            total: response.meta.pagination.total,
                        },
                    });
                    this._products.next(response.data);
                })
            );
    }

    /**
     * Get Asset Type
     */
    getMaterial(): Observable<any[]> {
        return this._httpClient
            .get<any[]>(environment.API_URL + 'api/get_asset_material')
            .pipe(
                tap((meterial) => {
                    this._materials.next(meterial);
                })
            );
    }

    getPrintingCost(req: any): Observable<any> {
        return this._httpClient
            .post<any>(
                environment.API_URL + 'api/get-printing-cost',
                req,
                this.httpOptionsFormdata
            )
            .pipe(
                take(1),
                map((products) => {
                    return products.data;
                }),
                switchMap((product) => {
                    if (!product) {
                        return throwError('Could not found cost with id of !');
                    }

                    return of(product);
                })
            );
    }

    importOsm(data: any): Observable<any> {
        return this._httpClient.post<any>(
            environment.API_URL + 'api/import-osm',
            data,
            { headers: this.httpOptionsFormdata.headers }
        );
    }

    setSchedule(data: any): Observable<any> {
        return this._httpClient.post<any>(
            environment.API_URL + 'api/set-job-schedule',
            data,
            { headers: this.httpOptionsFormdata.headers }
        );
    }

    deleteOsm(id: string): Observable<any> {
        return this._httpClient.delete<any>(
            `${environment.API_URL}api/brief-osms/` + id,
            { headers: this.httpOptionsFormdata.headers }
        );
    }

    // * create position
    create(data: any): Observable<any> {
        return this._httpClient
            .post(environment.API_URL + '/api/rolepermisions/add', data, {
                headers: this.httpOptionsFormdata.headers,
            })
            .pipe(
                switchMap((response: any) => {
                    // Return a new observable with the response
                    return of(response);
                })
            );
    }

    // get position //
    getList(): Observable<any> {
        return this._httpClient
            .get<any>(environment.API_URL + 'api/get_position')
            .pipe(
                tap((meterial) => {
                    this._materials.next(meterial);
                })
            );
    }

    getCategory(): Observable<any> {
      return this._httpClient.get<any>(environment.API_URL + '/api/get_blog_category').pipe(
        tap((data) => {
          this._materials.next(data);
        })
      );
    }

    //* get position by id
    getById(id: any): Observable<any[]> {
        return this._httpClient
            .get<any[]>(environment.API_URL + '/api/category_product/' + id)
            .pipe(
                tap((meterial) => {
                    this._materials.next(meterial);
                })
            );
    }

    getShelf(): Observable<any> {
        return this._httpClient
            .get<any>(environment.API_URL + '/api/get_shelf')
            .pipe(
                tap((meterial) => {
                    this._materials.next(meterial);
                })
            );
    }

    getChanel(id): Observable<any> {
        return this._httpClient
            .get<any>(environment.API_URL + '/api/get_floor/'+ id)
            .pipe(
                tap((meterial) => {
                    this._materials.next(meterial);
                })
            );
    }



    //   * update branch
    update(data: any, id): Observable<any> {
        return this._httpClient
            .post(
                environment.API_URL + '/api/rolepermisions/update/' + id ,
                data,
                this.httpOptionsFormdata
            )
            .pipe(
                switchMap((response: any) => {
                    // Return a new observable with the response
                    return of(response);
                })
            );
    }
    updateFloor(data: any, id: any): Observable<any> {
        return this._httpClient
            .put(
                environment.API_URL + '/api/floor/' + id,
                data
            )
            .pipe(
                switchMap((response: any) => {
                    // Return a new observable with the response
                    return of(response);
                })
            );
    }
    updateChanel(data: any, id: any): Observable<any> {
        return this._httpClient
            .put(
                environment.API_URL + '/api/chanel/' + id,
                data
            )
            .pipe(
                switchMap((response: any) => {
                    // Return a new observable with the response
                    return of(response);
                })
            );
    }

    newFloor(data: any): Observable<any> {
        return this._httpClient
            .post(
                environment.API_URL + '/api/floor',
                data
            )
            .pipe(
                switchMap((response: any) => {
                    // Return a new observable with the response
                    return of(response);
                })
            );
    }
    newChannel(data: any): Observable<any> {
        return this._httpClient
            .post(
                environment.API_URL + '/api/channel',
                data
            )
            .pipe(
                switchMap((response: any) => {
                    // Return a new observable with the response
                    return of(response);
                })
            );
    }

    delete(id: any): Observable<any> {
        return this._httpClient.delete<any>(
            environment.API_URL + '/api/rolepermisions/delete/' + id,
            { headers: this.httpOptionsFormdata.headers }
        );
    }

    getPage(dataTablesParameters: any): Observable<DataTablesResponse> {
        return this._httpClient
            .post(
                environment.API_URL + '/api/rolepermisions/getPage',
                dataTablesParameters,
                this.httpOptionsFormdata
            )
            .pipe(
                switchMap((response: any) => {
                    return of(response.data);
                })
            );
    }
    getPageFloor(dataTablesParameters: any): Observable<DataTablesResponse> {
        return this._httpClient
            .post(
                environment.API_URL + '/api/floor_page',
                dataTablesParameters,
                this.httpOptionsFormdata
            )
            .pipe(
                switchMap((response: any) => {
                    return of(response.data);
                })
            );
    }

    getAll(): Observable<any> {
        return this._httpClient.get<any>(environment.API_URL + '/api/department/getPage');
    }

    getPermission(): Observable<any> { 
        return this._httpClient
        .get<any>(environment.API_URL + '/api/permissions/show')
        .pipe(switchMap((response: any) => { 
            return of(response); })); }
    getRole(): Observable<any> { 
        return this._httpClient
        .get<any>(environment.API_URL + '/api/role/show')
        .pipe(switchMap((response: any) => { 
            return of(response); })); }
}
