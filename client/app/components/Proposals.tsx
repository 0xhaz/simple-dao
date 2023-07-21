import React from "react";

const Proposals = () => {
  const active = `bg-blue-600 px-4 py-2.5 font-medium text-xs leading-tight uppercase  text-white shadow-md shadow-gray-400 active:bg-blue-800 dark:shadow-transparent transition duration-150 ease-in-out  dark:border dark:border-blue-500  border border-blue-600 hover:text-white`;

  const inactive = `bg-transparent px-4 py-2.5 font-medium text-xs leading-tight uppercase text-blue-600 shadow-md shadow-gray-400 active:bg-blue-800 dark:shadow-transparent transition duration-150 ease-in-out dark:border dark:border-blue-600 border border-blue-600 hover:text-white hover:bg-blue-600`;

  return (
    <div className="flex flex-col p-8">
      <div className="flex justify-center items-center" role="group">
        <button className={`rounded-l-full ${active} `}>All</button>
        <button className={` ${inactive} `}>Open</button>
        <button className={`rounded-r-full ${inactive} `}>Closed</button>
      </div>

      <div className="overflow-x-auto sm:mx-6 lg:mx-8">
        <div className="py-2 inline-block min-w-full sm:px-6 lg:px-8">
          <div className="h-[calc(100vh_-_20rem)] overflow-y-auto shadow-md rounded-md">
            <table className="min-w-full">
              <thead className="border-b dark:border-gray-500">
                <tr>
                  <th
                    scope="col"
                    className="text-sm font-medium px-6 py-4 text-left"
                  >
                    Created By
                  </th>
                  <th
                    scope="col"
                    className="text-sm font-medium px-6 py-4 text-left"
                  >
                    Title
                  </th>
                  <th
                    scope="col"
                    className="text-sm font-medium px-6 py-4 text-left"
                  >
                    Expires
                  </th>
                  <th
                    scope="col"
                    className="text-sm font-medium px-6 py-4 text-left"
                  >
                    Action
                  </th>
                </tr>
              </thead>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Proposals;
