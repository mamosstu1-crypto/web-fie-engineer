import { Route, Routes } from '@angular/router';

import { FormComponent } from './form/form.component';
import { DocumentComponent } from './page.component';
import { inject } from '@angular/core';
import { TransactionComponent } from './transaction/transaction.component';
import { DocumentPageComponent } from './document-page.component';
import { StockService } from './page.service';
import { FormInvoiceComponent } from './form-invoice/form.component';
import { FormBillingComponent } from './form-billing/form.component';


export const documentRoute: Route[] = [
    {
        path: '',
        component: DocumentPageComponent,
        children: [
            {
                path: 'list/quotation',
                component: DocumentComponent,
                data: {
                    status: 'quotation'
                },
                resolve: {
                    // company: () => inject(PageService).getCompany(),
                },

            },
            {
                path: 'transaction/:id',
                component: TransactionComponent,
                data: {
                    status: 'Transaction'
                },

            },
            {
                path: 'list/taxinvoice',
                component: DocumentComponent,
                data: {
                    status: 'taxinvoice'
                },
                resolve: {
                    // company: () => inject(PageService).getCompany(),
                }
            },
            {
                path: 'list/billing',
                component: DocumentComponent,
                data: {
                    status: 'billing'
                },
                resolve: {
                    // company: () => inject(PageService).getCompany(),
                }
            },
            {
                path: 'list/invoice',
                component: DocumentComponent,
                data: {
                    status: 'invoice'
                },
                resolve: {
                    // company: () => inject(PageService).getCompany(),
                }
            },
            {
                path: 'form/quotation',
                component: FormComponent,
                data: {
                    status: 'quotation'
                },
                resolve: {
                    service: () => inject(StockService).getService(),
                    customer: () => inject(StockService).getCustomer(),
                    branch: () => inject(StockService).getBranch(),
                }
            },
            {
                path: 'form/taxinvoice',
                component: FormComponent,
                data: {
                    status: 'taxinvoice'
                },
                resolve: {
                    service: () => inject(StockService).getService(),
                    customer: () => inject(StockService).getCustomer(),
                    branch: () => inject(StockService).getBranch(),
                }
            },
            {
                path: 'form/invoice/:quotation_id',
                component: FormInvoiceComponent,
                resolve: {
                    service: () => inject(StockService).getService(),
                    customer: () => inject(StockService).getCustomer(),
                    branch: () => inject(StockService).getBranch(),
                },
                data: {
                    status: 'invoice'
                },
            },
            {
                path: 'edit/invoice/:id',
                component: FormInvoiceComponent,
                resolve: {
                    service: () => inject(StockService).getService(),
                    customer: () => inject(StockService).getCustomer(),
                    branch: () => inject(StockService).getBranch(),
                },
                data: {
                    status: 'invoice'
                },
            },
            {
                path: 'edit/taxinvoice/:id',
                component: FormComponent,
                resolve: {
                    service: () => inject(StockService).getService(),
                    customer: () => inject(StockService).getCustomer(),
                    branch: () => inject(StockService).getBranch(),
                },
                data: {
                    status: 'taxinvoice'
                },
            },
            {
                path: 'edit/quotation/:id',
                component: FormComponent,
                resolve: {
                    service: () => inject(StockService).getService(),
                    customer: () => inject(StockService).getCustomer(),
                    branch: () => inject(StockService).getBranch(),
                },
                data: {
                    status: 'quotation'
                },
            },
            {
                path: 'form/billing',
                component: FormBillingComponent,
                resolve: {
                    service: () => inject(StockService).getService(),
                    customer: () => inject(StockService).getCustomer(),
                    branch: () => inject(StockService).getBranch(),
                    invoice: () => inject(StockService).getInvoicesForBilling(),
                },
                data: {
                    status: 'billing'
                },
            },
            {
                path: 'edit/billing/:id',
                component: FormBillingComponent,
                resolve: {
                    service: () => inject(StockService).getService(),
                    customer: () => inject(StockService).getCustomer(),
                    branch: () => inject(StockService).getBranch(),
                    invoice: () => inject(StockService).getInvoice(),
                },
                data: {
                    status: 'billing'
                },
            },
        ]
    }

] as Routes;
