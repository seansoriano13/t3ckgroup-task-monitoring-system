// Generouted, changes to this file will be overridden
/* eslint-disable */

import { components, hooks, utils } from '@generouted/react-router/client'

export type Path =
  | `/`
  | `/approvals`
  | `/approvals/sales`
  | `/hr-master-log`
  | `/hr/employee-management`
  | `/login`
  | `/profile`
  | `/sales/daily`
  | `/sales/log-sales`
  | `/sales/records`
  | `/sales/schedule`
  | `/settings`
  | `/super-admin`
  | `/tasks`

export type Params = {
  
}

export type ModalPath = never

export const { Link, Navigate } = components<Path, Params>()
export const { useModals, useNavigate, useParams } = hooks<Path, Params, ModalPath>()
export const { redirect } = utils<Path, Params>()
