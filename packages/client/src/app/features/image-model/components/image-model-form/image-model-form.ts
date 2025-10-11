import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-image-model-form',
  imports: [ReactiveFormsModule],
  templateUrl: './image-model-form.html',
  styleUrl: './image-model-form.scss'
})
export class ImageModelFormComponent {
  @Input() form!: FormGroup;
  @Input() loading = false;
  @Input() hasFile = false;
  @Output() submitForm = new EventEmitter<void>();
  @Output() resetForm = new EventEmitter<void>();

  onSubmit(): void {
    if (this.form.valid && this.hasFile) {
      this.submitForm.emit();
    } else {
      this.markFormGroupTouched();
    }
  }

  onReset(): void {
    this.resetForm.emit();
  }

  /**
   * Mark all form controls as touched to show validation errors
   */
  private markFormGroupTouched(): void {
    Object.keys(this.form.controls).forEach(key => {
      const control = this.form.get(key);
      control?.markAsTouched();
    });
  }

  /**
   * Get validation error message for a form control
   */
  getErrorMessage(controlName: string): string | null {
    const control = this.form.get(controlName);
    
    if (control?.errors && control.touched) {
      if (control.errors['required']) {
        return `${controlName} is required`;
      }
      if (control.errors['pattern']) {
        return `${controlName} format is invalid`;
      }
      if (control.errors['min']) {
        return `${controlName} must be at least ${control.errors['min'].min}`;
      }
      if (control.errors['max']) {
        return `${controlName} must not exceed ${control.errors['max'].max}`;
      }
    }
    
    return null;
  }

  /**
   * Check if a form control has validation errors
   */
  hasError(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!(control?.errors && control.touched);
  }
}

