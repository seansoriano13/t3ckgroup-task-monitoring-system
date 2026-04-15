import { useEffect } from "react";
import { Navigate } from "react-router";
import toast from "react-hot-toast";

export default function HrMasterLogPage() {
  useEffect(() => {
    toast("Master Log has been archived. Redirecting to Tasks…", {
      id: "master-log-archived",
    });
  }, []);

  return (
    <Navigate to="/tasks" replace />
  );
}
