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
import { environment } from 'environments/environment';
import { AssetCategory } from 'app/shared/asset-category';
import { DataTablesResponse } from 'app/shared/datatable.types';
// import { UserDetail } from '../user/user.types';
const token = localStorage.getItem('accessToken') || null;
@Injectable({
    providedIn: 'root',
})
export class Service {
    dtElement: any;
    /**
     * Constructor
     */
    constructor(private _httpClient: HttpClient) { }

    httpOptionsFormdata = {
        headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
    };
    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    handlerError(error): Observable<never> {
        let errorMessage = 'Error unknown';
        if (error) {
            errorMessage = `${error.error.message}`;
        }
        // window.alert(errorMessage);
        return throwError(errorMessage);
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
            .post(environment.API_URL + '/api/role/add', data, {
                headers: this.httpOptionsFormdata.headers,
            })
            .pipe(
                switchMap((response: any) => {
                    // Return a new observable with the response
                    return of(response);
                })
            );
    }


    //   * update branch
    update(data: any, id): Observable<any> {
        return this._httpClient
            .post(
                environment.API_URL + '/api/role/update/' + id,
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
    updateMenusPermission(data: any, id): Observable<any> {
        return this._httpClient
            .post(
                environment.API_URL + '/api/menuspermission/update/' + id,
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


    delete(id: any): Observable<any> {
        return this._httpClient.delete<any>(
            environment.API_URL + '/api/role/delete/' + id,
            { headers: this.httpOptionsFormdata.headers }
        );
    }

    getPage(dataTablesParameters: any): Observable<DataTablesResponse> {
        return this._httpClient
            .post(
                environment.API_URL + '/api/role/getPage',
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
        return this._httpClient.get<any>(environment.API_URL + '/api/role/getPage');
    }

    getVehicleTypes(): Observable<any> {
        return this._httpClient
            .get<any>(environment.API_URL + '/api/vehicle/types/show')
            .pipe(switchMap((response: any) => {
                return of(response);
            }));
    }

    rerender(): void {
        this.dtElement.dtInstance.then((dtInstance: DataTables.Api) => {
            dtInstance.ajax.reload();
        });
    }

    get(id): Observable<any> {
        return this._httpClient
            .get<any>(environment.API_URL + '/api/role/showID/'+ id)
    }
}
