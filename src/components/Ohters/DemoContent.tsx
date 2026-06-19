export default function DemoContent() {
  return (
    <div className=" w-full h-full justify-center flex flex-col items-center text-white  select-none">
      <div>
        <div className="text-4xl cursor-target">Hellow QuickUI</div>
        <div className="flex flex-row items-center justify-between  space-x-16 ">
          <p data-nohit className="flex items-center justify-center h-[300px] w-[300px] bg-red-500/35">
            Has data-nohit Attribute: Mouse Non-Penetrable
          </p>
          <p className="flex items-center justify-center h-[300px] w-[300px] bg-green-500/35">
            No data-nohit Attribute: Mouse Penetrable
          </p>
        </div>
      </div>
    </div>
  )
}
