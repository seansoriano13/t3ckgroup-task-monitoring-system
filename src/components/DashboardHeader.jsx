import { Search } from "lucide-react";
import { INPUT_STYLE } from "../pages/login";
import { Bell } from "lucide-react";

function DashboardHeader() {
  const employeeName = "Sean";
  return (
    <>
      <div className="grid gap-8">
        <div className="flex-between">
          {/* SEARCH */}
          <div className="relative inline-block">
            <input
              className={`${INPUT_STYLE} text-gray-12 px-4! pr-12! placeholder:text-sm placeholder:text-gray-10`}
              placeholder="Search Task..."
              type="text"
            />
            <Search
              size={20}
              className=" absolute text-gray-6 right-4 top-1/2 -translate-y-1/2"
            />
          </div>
          {/* NOTIF */}
          <div>
            <Bell className="fill-gray-5 text-gray-5" />
          </div>
        </div>
        <div className="relative z-0 bg-black rounded-lg">
          <img
            className="opacity-80  absolute inset-0 w-full h-full object-cover rounded-lg"
            src="/leaf-background.jpg"
            alt=""
          />
          <div className="relative z-10 p-8 text-white flex-between">
            <div>
              <h1 className="text-4xl font-bold">Hi {employeeName},</h1>
              <p className="text-gray-11">Good to see you back!</p>
            </div>
            <div>
              <p className="italic text-sm text-right">
                Begin each day with a <br /> Grateful Heart.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default DashboardHeader;
