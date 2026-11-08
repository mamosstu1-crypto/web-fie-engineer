import { Injectable, NgModule, Pipe, PipeTransform } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { FormGroup } from '@angular/forms';
import { ChangeDetectorRef } from '@angular/core';
import { fromEvent, map, Observable, startWith, tap } from 'rxjs';
import { NativeDateAdapter } from '@angular/material/core';
import moment from 'moment';
import { MatDatepickerInputEvent } from '@angular/material/datepicker';
import { BaseService } from './app.service';
import { HttpClient } from '@angular/common/http';

export const DATE_TH_FORMATS = {
    parse: { dateInput: 'DD/MM/YYYY', },
    display: {
        dateInput: 'DD/MM/YYYY', monthYearLabel: 'MMM YYYY',
        dateA11yLabel: 'DD/MM/YYYY', monthYearA11yLabel: 'MMMM YYYY',
    },
};

@Injectable()
export class CustomDateAdapter extends NativeDateAdapter {
    override format(date: Date, displayFormat: Object): string {
        let day = date.getDate();
        let month = date.getMonth() + 1;
        let year = date.getFullYear() + 543;
        return `${this._to2digit(day)}/${this._to2digit(month)}/${year}`;
    }

    override getYearName(date: Date): string {
        return `${date.getFullYear() + 543}`;
    }

    // Override ฟังก์ชัน parse เพื่อตรวจสอบการพิมพ์วันที่
    override parse(value: any): Date | null {
        if (!value) return null;

        // แยกวัน/เดือน/ปี
        const dateParts = value.split('/');
        if (dateParts.length !== 3) return null;

        let day = parseInt(dateParts[0], 10);
        let month = parseInt(dateParts[1], 10) - 1;
        let year = parseInt(dateParts[2], 10);

        // ตรวจสอบถ้าเป็น พ.ศ.
        if (year > 2400) { year -= 543; }

        return new Date(year, month, day);
    }

    private _to2digit(n: number): string { return ('00' + n).slice(-2); }
}

interface DataRowRef {
    [key: string]: any; // ใช้ index signature เพื่อรองรับชื่อที่ไม่แน่นอน
}

@Injectable({
	providedIn: 'root',
})
export class UtilityService extends BaseService {

    constructor(
        private _fuseConfirm: FuseConfirmationService,
        public _httpClient: HttpClient
    ) {
        super(_httpClient);
    }

	/** Configures DataTables options and handles server-side pagination. */
    loadTable(
        dtOptionsRef: any,
        service: any,
        changeDetectorRef: ChangeDetectorRef,
        pagesRef: any,
        dataRowRef: { dataRow: any },
        start: number,
        currentStartRef: { currentStart: number },
        additionalParams?: { [key: string]: any } // <-- Accept an object of additional parameters
    ): void {
        dtOptionsRef.dtOptions = {
            pagingType: 'full_numbers',
            pageLength: 10,
            displayStart: start,
            serverSide: true,
            processing: true,
            responsive: true,
            language: { url: 'https://cdn.datatables.net/plug-ins/1.11.3/i18n/th.json' },
            ajax: (dataTablesParameters: any, callback: any) => {
                currentStartRef.currentStart = dataTablesParameters.start;

                // Merge additionalParams with dataTablesParameters if provided
                if (additionalParams) {
                    Object.assign(dataTablesParameters, additionalParams);
                }

                // Send the request with the merged parameters
                service.getPage(dataTablesParameters).subscribe((resp: any) => {
                    dataRowRef.dataRow = resp.data;
                    this.updatePagination(resp, pagesRef);
                    callback({
                        recordsTotal: resp.total,
                        recordsFiltered: resp.total,
                        data: [],
                    });
                    changeDetectorRef.markForCheck();
                });
            },
        };
    }

    loadTableN(
        dtOptionsRef: any,
        service: any,
        changeDetectorRef: ChangeDetectorRef,
        pagesRef: any,
        dataRowRef: DataRowRef, // เปลี่ยนประเภทของ dataRowRef
        start: number,
        currentStartRef: { currentStart: number },
        additionalParams?: { [key: string]: any }
    ): void {
        dtOptionsRef.dtOptions = {
            pagingType: 'full_numbers',
            pageLength: 10,
            displayStart: start,
            serverSide: true,
            processing: true,
            responsive: true,
            language: { url: 'https://cdn.datatables.net/plug-ins/1.11.3/i18n/th.json' },
            ajax: (dataTablesParameters: any, callback: any) => {
                currentStartRef.currentStart = dataTablesParameters.start;

                // Merge additionalParams with dataTablesParameters if provided
                if (additionalParams) {
                    Object.assign(dataTablesParameters, additionalParams);
                }

                // Send the request with the merged parameters
                service.getPage(dataTablesParameters).subscribe((resp: any) => {
                    if (dataRowRef.dataRow) {
                        dataRowRef.dataRow.length = 0; // Clear existing data
                        dataRowRef.dataRow.push(...resp.data); // Update dataRow with new data
                    } else {
                        console.warn('dataRow not found in dataRowRef');
                    }
                    this.updatePagination(resp, pagesRef);
                    callback({
                        recordsTotal: resp.total,
                        recordsFiltered: resp.total,
                        data: [],
                    });
                    changeDetectorRef.markForCheck(); // Ensure changes are detected
                });
            },
        };
    }

	/** Opens a confirmation dialog and creates a new item if confirmed. */
    createItem(
        service: any,
        fuseConfirmationService: FuseConfirmationService,
        submitForm: (action: (formData: FormData) => Observable<any>) => void,
        responseArray: any[]
    ): void {
        this.confirmAction('สร้างรายการใหม่', 'คุณต้องการสร้างรายการใหม่ใช่หรือไม่', fuseConfirmationService,
            () => submitForm((preparedData) => {
                return service.create(preparedData).pipe(
                    tap(resp => responseArray.push(resp))
                );
            })
        );
    }

    /** Opens a confirmation dialog and updates an existing item if confirmed. */
    updateItem(
        formData: FormGroup,
        service: any,
        fuseConfirmationService: FuseConfirmationService,
        submitForm: (action: (formData: FormData) => Observable<any>) => void,
        responseArray: any[]
    ): void {
        this.confirmAction('แก้ไขรายการ', 'คุณต้องการแก้ไขรายการใช่หรือไม่', fuseConfirmationService,
            () => submitForm((preparedData) => {
                return service.update(preparedData, formData.value.id).pipe(
                    tap(resp => responseArray.push(resp))
                );
            })
        );
    }

	/** Opens a confirmation dialog and deletes an item if confirmed. */
	deleteItem(
		id: any,
		service: any,
		fuseConfirmationService: FuseConfirmationService,
		rerender: () => void,
		responseArray: any[]
	): void {
		this.confirmAction('ลบรายการที่เลือก', 'คุณต้องการลบรายการที่เลือกใช่หรือไม่', fuseConfirmationService,
			() => service.delete(id).subscribe({
				next: (response) => { if (responseArray) { responseArray.push(response); } rerender(); },
				error: err => this.showError(err.error.message, fuseConfirmationService),
			})
		);
	}

	/** Submits a form and handles success or error responses with flash messages and updates. */
	submitForm(
        formData: FormGroup,
        action: (formData: FormData) => Observable<any>,
        changeDetectorRef: ChangeDetectorRef,
        fuseConfirmationService: FuseConfirmationService,
        flashMessageRef: { flashMessage: 'success' | 'error' | null },
        rerender: () => void,
        closeDialog: () => void
    ): void {
        action(this.prepareFormData(formData)).subscribe({
            next: (response) => {
                this.showFlashMessage('success', changeDetectorRef, flashMessageRef);
                rerender();
                closeDialog();
            },
            error: (err) => {
                this.showError(err.error.message, fuseConfirmationService);
            }
        });
    }

	/** Checks if the user has the specified permission. */
	hasPermission(permissionId: number): boolean {
		return JSON.parse(localStorage.getItem('permission')).id === permissionId;
	}

	/** Converts FormGroup values to FormData. */
	prepareFormData(form: FormGroup): FormData {
		const formData = new FormData();
		Object.entries(form.value).forEach(([key, value]: any[]) => {
			formData.append(key, value);
		});
		return formData;
	}

	/** Updates pagination information based on response data. */
	updatePagination(resp: any, pages: any): void {
		pages.current_page = resp.current_page;
		pages.last_page = resp.last_page;
		pages.per_page = resp.per_page;
		pages.begin = resp.current_page > 1
			? resp.per_page * (resp.current_page - 1)
			: 0;
	}

	/** Displays an error message using a confirmation dialog. */
	showError(message: string, confirmationService: FuseConfirmationService): void {
		confirmationService.open({
			title: 'กรุณาระบุข้อมูล',
			message,
			icon: { show: true, name: 'heroicons_outline:exclamation', color: 'warning' },
			actions: {
				confirm: { show: false },
				cancel: { show: false },
			},
			dismissible: true,
		});
	}

	/** Opens a confirmation dialog with specified title and message. */
	confirmAction(
        title: string,
        message: string,
        confirmationService: FuseConfirmationService,
        onConfirm?: () => void,
        options?: {
            onCancel?: () => void,
            onDismiss?: () => void,
            showConfirm?: boolean,
            showCancel?: boolean,
            confirmLabel?: string,
            cancelLabel?: string
        }
    ): void {
        const {
            onCancel = () => {},
            onDismiss = () => {},
            showConfirm = true,
            showCancel = true,
            confirmLabel = 'ยืนยัน',
            cancelLabel = 'ยกเลิก'
        } = options || {};

        const confirmation = confirmationService.open({
            title, message,
            icon: { show: false, name: 'heroicons_outline:exclamation', color: 'warning' },
            actions: {
                confirm: { show: showConfirm, label: confirmLabel, color: 'sky' },
                cancel: { show: showCancel, label: cancelLabel },
            },
            dismissible: true,
        });

        // Listen to keydown events
        const subscription = fromEvent<KeyboardEvent>(document, 'keydown')
        .subscribe(event => {
            if (event.key === 'Enter') {
                onConfirm?.();
                confirmation.close(); // Close the dialog when Enter is pressed
                subscription.unsubscribe(); // Clean up the subscription
            }
        });

        confirmation.afterClosed().subscribe(result => {
            if (result === 'confirmed') { onConfirm?.(); }
            if (result === 'cancelled') { onCancel(); }
            if (result === 'dismissed') { onDismiss(); }

            subscription.unsubscribe();
        });
    }

	/** Opens a dialog with the given template and ensures form data is updated. */
    private openDialogRefs: MatDialogRef<any>[] = [];
	openDialog(
        dialog: MatDialog,
        template: any,
        dialogWidth: number,
        formData: FormGroup
    ): MatDialogRef<any> {
        const dialogRef = dialog.open(template, { width: dialogWidth + '%' });
        this.openDialogRefs.push(dialogRef);

        dialogRef.afterClosed().subscribe(() => {
            formData.patchValue(Object.fromEntries(Object.keys(formData.controls).map(key => [key, ''])));
            this.openDialogRefs = this.openDialogRefs.filter(ref => ref !== dialogRef);
        });

        return dialogRef;
    }

    /** Closes a specific dialog. */
    closeDialog(dialogRef: MatDialogRef<any>): void {
        dialogRef.close();
        this.openDialogRefs = this.openDialogRefs.filter(ref => ref !== dialogRef);
    }

    /** Closes all open dialogs. */
    closeAllDialogs(): void {
        this.openDialogRefs.forEach(ref => ref.close());
        this.openDialogRefs = [];
    }

	/** Shows a flash message of the specified type and hides it after a timeout. */
	showFlashMessage(
		type: 'success' | 'error',
		changeDetectorRef: ChangeDetectorRef,
		flashMessageRef: { flashMessage: 'success' | 'error' | null }
	): void {
		flashMessageRef.flashMessage = type;
		changeDetectorRef.markForCheck();
		setTimeout(() => {
			flashMessageRef.flashMessage = null;
			changeDetectorRef.markForCheck();
		}, 3000);
	}

	/** Filters a list based on the search value and key. */
	utilsFilter(list: any[], searchValue: string, key: string): any[] {
		const filterValue = searchValue.toLowerCase();
		return list.filter(item => item[key].toLowerCase().includes(filterValue));
	}

	/** Provides filtered results for autocomplete based on the control's value. */
	autoComplete(control: Observable<string>, list: any[], key: string): Observable<any[]> {
		return control.pipe(
			startWith(''),
			map(value => this.utilsFilter(list, value, key))
		);
	}

    onDateChange(event: MatDatepickerInputEvent<Date>, controlName: string, formName: FormGroup): void {
        if (event.value) {
            // แปลงวันที่เป็นเวลา 00:00:00 ของวันนั้นในเวลาท้องถิ่น (GMT+7)
            const localDate = moment(event.value)
                .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
                .format('YYYY-MM-DD');

            // ตั้งค่าลง FormControl
            formName.get(controlName)?.setValue(localDate);
        }
    }


    onDateInput(event: any): void {
        let value: string = event.target.value;

        value = value.replace(/\D/g, '');

        if (value.length >= 3 && value.length <= 4) {
            value = `${value.slice(0, 2)}/${value.slice(2)}`;
        } else if (value.length >= 5) {
            value = `${value.slice(0, 2)}/${value.slice(2, 4)}/${value.slice(4)}`;
        }

        event.target.value = value;
    }

    pdfDateFormat(date: any): string {
        if (!date) return '';
        const d = new Date(date);
        let month = '' + (d.getMonth() + 1);
        let day = '' + d.getDate();
        const year = d.getFullYear();

        if (month.length < 2) month = '0' + month;
        if (day.length < 2) day = '0' + day;

        return [year, month, day].join('-');
    }

    pdfDefaultDate(request: string): Date {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        switch (request) {
            case 'firstDayOfMonth': return firstDayOfMonth;
            case 'lastDayOfMonth': return lastDayOfMonth;
            default: return now;
        }
    }

    openPDF(url: string): void {
        fetch(url)
            .then((response) => {
                switch (response.status) {
                    case 200: window.open(url); break;
                    case 500: this.handleApiError({ error: { message: "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้" }}); break;
                    default:
                        return response.json()
                            .then((data) => { this.handleApiError({ error: { message: data.message || "เกิดข้อผิดพลาดในการเปิดเอกสาร" } }); })
                            .catch(() => { this.handleApiError({ error: { message: "ไม่สามารถอ่านข้อมูลเพิ่มเติมได้" }}); });
                }
            })
            .catch(() => { this.handleApiError({ error: { message: "เกิดข้อผิดพลาดในการเชื่อมต่อ" }}); });
    }

    handleApiError(error: any): void {
        this.confirmAction( 'ข้อผิดพลาด',  error.error.message, this._fuseConfirm,
            () => {}, { showConfirm: false, showCancel: false }
        );
    }
}
