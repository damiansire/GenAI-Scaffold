import { Component, Input, Output, EventEmitter, ElementRef, ViewChild } from '@angular/core';

@Component({
  selector: 'app-file-upload',
  imports: [],
  templateUrl: './file-upload.html',
  styleUrl: './file-upload.scss'
})
export class FileUploadComponent {
  @Input() accept = 'image/*';
  @Input() maxSizeMB = 10;
  @Input() allowedTypes: string[] = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
  @Input() selectedFile: File | null = null;
  
  @Output() fileSelected = new EventEmitter<File>();
  @Output() fileCleared = new EventEmitter<void>();
  @Output() error = new EventEmitter<string>();
  
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      // Validate file type
      if (!this.allowedTypes.includes(file.type)) {
        const allowedExtensions = this.allowedTypes.map(type => type.split('/')[1]).join(', ');
        this.error.emit(`Please select a valid file (${allowedExtensions.toUpperCase()})`);
        return;
      }

      // Validate file size
      const maxSize = this.maxSizeMB * 1024 * 1024;
      if (file.size > maxSize) {
        this.error.emit(`File size must not exceed ${this.maxSizeMB}MB`);
        return;
      }

      this.fileSelected.emit(file);
    }
  }

  clearFile(): void {
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
    this.fileCleared.emit();
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getFileTypeIcon(mimeType: string): string {
    if (mimeType.startsWith('image/')) {
      return '🖼️';
    }
    return '📄';
  }
}

