import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Injectable({
    providedIn: 'root',
})
export class FormDataFrame {
    constructor(private _formBuilder: FormBuilder) {}

    createMainForm(): FormGroup {
        return this._formBuilder.group({
            registration_date: ['', Validators.required],
            license_plate: ['', Validators.required],
            province_id: ['', Validators.required],
            vehicle_inspection_types_id: ['', Validators.required],
            insurance_types_id: ['', Validators.required],
            brand_id: ['', Validators.required],
            model_id: [''],
            chassis_number: [''],
            engine_number: [''],
            fuel_type: ['', Validators.required],
            fuel: [''],
            cc: ['', Validators.required],
            weight: ['', Validators.required],
            weight_loaded: [''],
            seat_count: [''],
            customer_id: [''],
            id: [''],
            vehicle_gas: [''],
            mileage: [''],
            rynumber: [''],
        });
    }

    createGasEditForm(): FormGroup {
        return this._formBuilder.group({
            vehicle_id: [''],
            gas_type: [''],
            gas_position: [''],
            gas_model: [''],
            gas_brand: [''],
            gas_number: [''],
            gas_weight: [''],
            gas_thick: [''],
            gas_capacity: [''],
            gas_create: [''],
            gas_expire: [''],
        });
    }

    createGasAddForm(): FormGroup {
        return this._formBuilder.group({
            gas: this._formBuilder.array([]),
        });
    }
}
