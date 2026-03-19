import { useAuth } from "../context/AuthContext";

function TopNavbar() {
  const { logout } = useAuth();
  return (
    <>
      <div className="flex-between">
        <div className="wrapper">Nav</div>
        <button onClick={logout}>Logout</button>
      </div>
    </>
  );
}

export default TopNavbar;
