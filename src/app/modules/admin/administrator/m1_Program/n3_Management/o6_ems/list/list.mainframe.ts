import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Injectable({
    providedIn: 'root',
})
export class FormDataFrame {
    constructor(private _formBuilder: FormBuilder) {}

    createMainForm(): FormGroup {
        return this._formBuilder.group({
            id: [''],
            ems: ['', Validators.required],
            no: [''],
            inspection_id: [''],
            province_id: ['', Validators.required],
            district_id: ['', Validators.required],
            subdistrict_id: ['', Validators.required],
            address: ['', Validators.required],
            name: ['', Validators.required],
            province: ['', Validators.required],
            districts: ['', Validators.required],
            subdistricts: ['', Validators.required],
            photo: [''],

            zip_code: [''],

            startDate: [''],
            endDate: [''],
        });
    }

    createAddressForm(): FormGroup {
        return this._formBuilder.group({
            address: [''],
            zip_code: [''],
            subdistricts: [''],
            districts: [''],
            province: [''],
            subdistrict_id: [''],
            district_id: [''],
            province_id: [''],
        });
    }
}
