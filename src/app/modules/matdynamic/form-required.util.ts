import { AbstractControl, FormControl, Validators } from '@angular/forms';

/** ตรงกับ Validators.required บน control (รองรับ Angular hasValidator) */
export function controlHasRequiredValidator(control: AbstractControl | null | undefined): boolean {
    if (!control) {
        return false;
    }
    const asFc = control as FormControl;
    if (typeof asFc.hasValidator === 'function' && asFc.hasValidator(Validators.required)) {
        return true;
    }
    if (!control.validator) {
        return false;
    }
    const errors = control.validator({ value: control.value } as AbstractControl);

    return errors?.['required'] === true;
}

/** requiredMark: true/false บังคับ; ไม่ส่ง = อ่านจาก validator */
export function resolveRequiredMark(explicit: boolean | undefined, control: AbstractControl | null | undefined): boolean {
    if (explicit === true) {
        return true;
    }
    if (explicit === false) {
        return false;
    }

    return controlHasRequiredValidator(control);
}
