import { Component, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { API_CONFIG } from '../../core/tokens/api-config';
import { CommonModule } from '@angular/common';

interface QuotaResponse {
  tenantId: string;
  maxTokens: number;
  availableTokens: number;
  usedTokens: number;
  /** Length of the budget window in milliseconds (the budget is per window). */
  windowMs: number;
  usagePercentage: number;
}

@Component({
  selector: 'app-token-dashboard',
  imports: [CommonModule],
  templateUrl: './token-dashboard.html',
  styleUrl: './token-dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TokenDashboard {
  private readonly apiConfig = inject(API_CONFIG);

  quotaResource = httpResource<QuotaResponse>(() => ({
    url: `${this.apiConfig.baseUrl}/user/quota`,
    method: 'GET',
  }));

  quota = computed(() => this.quotaResource.value());
  isLoading = computed(() => this.quotaResource.isLoading());

  /**
   * Human-readable failure reason, or null. Without this the template rendered
   * an empty screen whenever the quota request failed (a 401 from the
   * fail-closed gateway is the common case), which reads as "no data" instead
   * of "the call failed".
   */
  errorMessage = computed(() => {
    const err = this.quotaResource.error();
    if (!err) return null;
    return err instanceof Error ? err.message : 'Could not load quota data.';
  });

  /** Window length rendered for humans (the budget is per window, not monthly). */
  windowLabel = computed(() => {
    const q = this.quota();
    if (!q) return '';
    const seconds = Math.round(q.windowMs / 1000);
    return seconds >= 60 ? `${Math.round(seconds / 60)} min` : `${seconds} s`;
  });

  retry(): void {
    this.quotaResource.reload();
  }

  // Helper for UI ring visualization
  strokeDashoffset = computed(() => {
    const q = this.quota();
    if (!q) return 283; // full ring
    const percentage = q.usagePercentage;
    return 283 - (283 * percentage) / 100;
  });

  statusColor = computed(() => {
    const q = this.quota();
    if (!q) return 'var(--primary-color)';
    if (q.usagePercentage > 90) return '#ff4757'; // red
    if (q.usagePercentage > 75) return '#ffa502'; // orange
    return 'var(--primary-color)';
  });
}
