import { salesQuotaService } from "./sales/salesQuotaService";
import { salesCategoryService } from "./sales/salesCategoryService";
import { salesEmployeeService } from "./sales/salesEmployeeService";
import { salesPlanService } from "./sales/salesPlanService";
import { salesExecutionService } from "./sales/salesExecutionService";
import { salesVerificationService } from "./sales/salesVerificationService";
import { salesRevenueService } from "./sales/salesRevenueService";
import { salesAdminService } from "./sales/salesAdminService";
import { salesTemplateService } from "./sales/salesTemplateService";

export const salesService = {
  ...salesQuotaService,
  ...salesCategoryService,
  ...salesEmployeeService,
  ...salesPlanService,
  ...salesExecutionService,
  ...salesVerificationService,
  ...salesRevenueService,
  ...salesAdminService,
  ...salesTemplateService,
};
