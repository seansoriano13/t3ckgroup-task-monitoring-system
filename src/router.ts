// Generouted, changes to this file will be overridden
/* eslint-disable */

import { components, hooks, utils } from '@generouted/react-router/client'

export type Path =
  | `/`
  | `/approvals`
  | `/approvals/components/ApprovalHeader`
  | `/approvals/components/ApprovalRow`
  | `/approvals/components/BulkGradeModal`
  | `/approvals/sales`
  | `/hr-master-log`
  | `/hr/management`
  | `/login`
  | `/profile`
  | `/sales/daily`
  | `/sales/daily/components/AddUnplannedForm`
  | `/sales/daily/components/ChecklistItem`
  | `/sales/daily/components/DailyCoverageTabs`
  | `/sales/daily/components/DailyTaskMatrix`
  | `/sales/log-sales`
  | `/sales/records`
  | `/sales/records/ActivitiesBoard`
  | `/sales/records/ActivitiesTable`
  | `/sales/records/EditRevenueModal`
  | `/sales/records/Pagination`
  | `/sales/records/RecordsHeader`
  | `/sales/records/RevenueTable`
  | `/sales/schedule`
  | `/sales/schedule/components/ScheduleActivityRow`
  | `/sales/schedule/components/ScheduleDayView`
  | `/sales/schedule/components/ScheduleHeader`
  | `/sales/schedule/components/ScheduleTabs`
  | `/sales/schedule/components/TemplateModals`
  | `/settings`
  | `/super-admin`
  | `/super-admin/activity-log`
  | `/tasks`

export type Params = {
  
}

export type ModalPath = never

export const { Link, Navigate } = components<Path, Params>()
export const { useModals, useNavigate, useParams } = hooks<Path, Params, ModalPath>()
export const { redirect } = utils<Path, Params>()
