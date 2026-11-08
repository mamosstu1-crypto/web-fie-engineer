import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { debounceTime, map, Observable, of, Subject, switchMap, takeUntil } from 'rxjs';
// import { BriefPlanService } from 'app/modules/admin/marketing/brief-plan/brief-plan.service';

@Component({
    selector: 'address-dialog',
    templateUrl: './address-dialog.component.html',
    // encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddressDialogInCustomerComponent implements OnInit, OnDestroy {
    private _unsubscribeAll: Subject<any> = new Subject<any>();
    address: any[] = []

    /**
     * Constructor
     */
    constructor(
        private _changeDetectorRef: ChangeDetectorRef,
        @Inject(MAT_DIALOG_DATA) private _data,
        private _matDialogRef: MatDialogRef<AddressDialogInCustomerComponent>
    ) {

        this._data.forEach(element => {
            const fullAddress = `${element.address ?? ''} ${element.provinces?.name_th ?? ''} ${element.districts?.name_th ?? ''} ${element.sub_districts?.name_th ?? ''} ${element.sub_districts?.zip_code ?? ''}`;
            this.address.push(fullAddress)
        });


    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {

    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    onSelect(item:any) {
        //* Example input: "100/240 หมู่ 11 กรุงเทพมหานคร สะพานสูง สะพานสูง 10240"
        const parts = item.split(' ');
        const zipCode = parts.pop(); // Get last part (10240)
        const subDistrict = parts.pop(); // Get second-to-last part (สะพานสูง)
        const district = parts.pop(); // Get third-to-last part (สะพานสูง)
        const province = parts.pop(); // Get fourth-to-last part (กรุงเทพมหานคร)
        const address = parts.join(' '); // "100/240 หมู่ 11"

        const item_ = [{
            address_all: item,
            address: address,
            provinces: province,
            districts: district,
            sub_districts: subDistrict,
            zip_code: zipCode
        }]
        this._matDialogRef.close(item_)
    }


    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------
}
