import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';

import { toUpper } from 'lodash';
import { BehaviorSubject, map, Observable, tap } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class StockService {
    private _sale_order: BehaviorSubject<any[] | null> = new BehaviorSubject(
        null
    );

    constructor(private http: HttpClient) {}

    getAll(dataTablesParameters: any, page: any): Observable<any> {
        let token = localStorage.getItem('accessToken');
        const headers = new HttpHeaders({
            Authorization: `Bearer ${token}`,
        });
        return this.http
            .post<any>(
                `${environment.API_URL}/api/${page}/getPage`,
                dataTablesParameters,
                { headers }
            )
            .pipe(
                map((data: any) => {
                    return data.data;
                })
            );
    }
    getTransaction(dataTablesParameters: any): Observable<any> {
        let token = localStorage.getItem('accessToken');
        const headers = new HttpHeaders({
            Authorization: `Bearer ${token}`,
        });
        return this.http
            .post<any>(
                `${environment.API_URL}/api/item_trans_page`,
                dataTablesParameters,
                { headers }
            )
            .pipe(
                map((data: any) => {
                    return data.data;
                })
            );
    }

    create(data: any, type: any) {
        if (type === 'quotation') {
            return this.http.post(
                `${environment.API_URL}/api/quotation/add`,
                data
            );
        } else if (type === 'taxinvoice') {
            return this.http.post(
                `${environment.API_URL}/api/taxinvoice/add`,
                data
            );
        } else {
            return;
        }
    }

    createInvoice(data: any) {
        return this.http.post(`${environment.API_URL}/api/invoice/add`, data);
    }
    createBilling(data: any) {
        return this.http.post(`${environment.API_URL}/api/billing/add`, data);
    }
    update(id: number, data: object, type: any) {
        if (type === 'quotation') {
            return this.http.post(
                `${environment.API_URL}/api/quotation/update/` + id,
                data
            );
        } else if (type === 'taxinvoice') {
            return this.http.post(
                `${environment.API_URL}/api/taxinvoice/update/` + id,
                data
            );
        } else {
            return;
        }
    }
    updateInvoice(id: number, data: object) {
        return this.http.post(
            `${environment.API_URL}/api/invoice/update/` + id,
            data
        );
    }
    udpateBilling(id: number, data: object) {
        return this.http.post(
            `${environment.API_URL}/api/billing/update/` + id,
            data
        );
    }

    updateStatus(id: number, data: object, type: any) {
        if (type === 'quotation') {
            return this.http.put(
                `${environment.API_URL}/api/quotation/update_status/` + id,
                data
            );
        } else if (type === 'invoice') {
            return this.http.put(
                `${environment.API_URL}/api/invoice/update_status/` + id,
                data
            );
        } else if (type === 'billing') {
            return this.http.put(
                `${environment.API_URL}/api/billing/update_status/` + id,
                data
            );
        } else if (type === 'taxinvoice') {
            return this.http.put(
                `${environment.API_URL}/api/taxinvoice/update_status/` + id,
                data
            );
        } else {
            return;
        }
    }

    updatePayment(data: object) {
        return this.http.post(
            `${environment.API_URL}/api/invoicepayment/add`,
            data
        );
    }
    AddByInvoice(data: object) {
        return this.http.post(
            `${environment.API_URL}/api/taxinvoice/store_by_invoice`,
            data
        );
    }
    AddByWorkOrder(data: object) {
        return this.http.post(
            `${environment.API_URL}/api/taxinvoice/store_by_work_order`,
            data
        );
    }

    getById(id: any, type: any) {
        if (type === 'quotation') {
            return this.http
                .get(`${environment.API_URL}/api/quotation/showID/` + id)
                .pipe(
                    tap((resp: any) => {
                        this._sale_order.next(resp.data);
                    })
                );
        } else if (type === 'invoice') {
            return this.http
                .get(`${environment.API_URL}/api/invoice/showID/` + id)
                .pipe(
                    tap((resp: any) => {
                        this._sale_order.next(resp.data);
                    })
                );
        } else if (type === 'billing') {
            return this.http
                .get(`${environment.API_URL}/api/billing/showID/` + id)
                .pipe(
                    tap((resp: any) => {
                        this._sale_order.next(resp.data);
                    })
                );
        } else if (type === 'taxinvoice') {
            return this.http
                .get(`${environment.API_URL}/api/taxinvoice/showID/` + id)
                .pipe(
                    tap((resp: any) => {
                        this._sale_order.next(resp.data);
                    })
                );
        }
    }
    getByIdInvoice(id: any) {
        return this.http
            .get(`${environment.API_URL}/api/invoice/showID/` + id)
            .pipe(
                tap((resp: any) => {
                    this._sale_order.next(resp.data);
                })
            );
    }
    getDocBycustomer(id: any) {
        return this.http
            .get(`${environment.API_URL}/api/doc_customer/by_customer/` + id)
            .pipe(
                tap((resp: any) => {
                    this._sale_order.next(resp.data);
                })
            );
    }

    getSaleOrder(data: any) {
        return this.http
            .get(environment.API_URL + '/api/get_sale_order', data)
            .pipe(
                tap((resp: any) => {
                    this._sale_order.next(resp);
                })
            );
    }
    getAllItem() {
        return this.http
            .post(environment.API_URL + '/api/get_item', { item_type_id: 1 })
            .pipe(
                tap((resp: any) => {
                    this._sale_order.next(resp);
                })
            );
    }

    delete(id: number, type: any) {
        if (type === 'quotation') {
            return this.http.delete(
                environment.API_URL + '/api/quotation/delete/' + id
            );
        } else if (type === 'invoice') {
            return this.http.delete(
                environment.API_URL + '/api/invoice/delete/' + id
            );
        } else if (type === 'billing') {
            return this.http.delete(
                environment.API_URL + '/api/billing/delete/' + id
            );
        } else if (type === 'taxinvoice') {
            return this.http.delete(
                environment.API_URL + '/api/taxinvoice/delete/' + id
            );
        }
    }
    deleteTransec(id: number) {
        return this.http.delete(
            environment.API_URL + '/api/invoicepayment/delete/' + id
        );
    }

    getService_() {
        return this.http.get(environment.API_URL + '/api/services/show').pipe(
            tap((resp: any) => {
                this._sale_order.next(resp);
            })
        );
    }
    getService() {
        return this.http
            .get(environment.API_URL + '/api/services/showall')
            .pipe(
                tap((resp: any) => {
                    this._sale_order.next(resp);
                })
            );
    }

    getCustomer() {
        return this.http.get(environment.API_URL + '/api/customer/show').pipe(
            tap((resp: any) => {
                this._sale_order.next(resp);
            })
        );
    }
    getInspection_vat() {
        return this.http
            .get(environment.API_URL + '/api/inspections/show_vat')
            .pipe(
                tap((resp: any) => {
                    this._sale_order.next(resp);
                })
            );
    }

    getBranch() {
        return this.http.get(environment.API_URL + '/api/Brache/show').pipe(
            tap((resp: any) => {
                this._sale_order.next(resp);
            })
        );
    }

    getInvoice() {
        return this.http.get(environment.API_URL + '/api/invoice/show').pipe(
            tap((resp: any) => {
                this._sale_order.next(resp);
            })
        );
    }
    getInvoicesForBilling() {
        return this.http
            .get(environment.API_URL + '/api/invoice/show_for_billing')
            .pipe(
                tap((resp: any) => {
                    this._sale_order.next(resp);
                }),
                map((resp: any) => resp?.data ?? resp)
            );
    }
    getInvoicePaid() {
        return this.http
            .get(environment.API_URL + '/api/invoice/showAllpaid')
            .pipe(
                tap((resp: any) => {
                    this._sale_order.next(resp);
                })
            );
    }
    getInvoice_tax() {
        return this.http
            .get(environment.API_URL + '/api/invoice/show_invoice')
            .pipe(
                tap((resp: any) => {
                    this._sale_order.next(resp);
                })
            );
    }
    getInvoice_tax_paid() {
        return this.http
            .get(environment.API_URL + '/api/invoice/show_invoice_paid')
            .pipe(
                tap((resp: any) => {
                    this._sale_order.next(resp);
                })
            );
    }
    getwork_order() {
        return this.http.get(environment.API_URL + '/api/WorkOrder/show').pipe(
            tap((resp: any) => {
                this._sale_order.next(resp);
            })
        );
    }
    getwork_order_paid() {
        return this.http
            .get(environment.API_URL + '/api/WorkOrder/show_paid')
            .pipe(
                tap((resp: any) => {
                    this._sale_order.next(resp);
                })
            );
    }

    getCustomerInvoice(data: any) {
        return this.http
            .get(environment.API_URL + '/api/invoice/showby', {
                params: {
                    type: data.type,
                    customer_id: data.customer_id,
                },
            })
            .pipe(
                tap((resp: any) => {
                    this._sale_order.next(resp);
                })
            );
    }
}
