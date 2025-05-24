import Button from '../atoms/Button';

interface AnnotationProps {
  name: string;
  type: 'POLYGON' | 'DIRECTIONAL';
}

export default function Annotation({ name, type }: AnnotationProps) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-gray-200">
      {/* Annotation item */}
      <div className="flex items-center gap-2 rounded-md p-2 hover:cursor-pointer hover:bg-gray-100">
        <div className="h-2 w-2 rounded-full bg-green-500" />
        <div className="flex flex-col">
          <p className="text-sm font-semibold">{name}</p>
          <p className="text-xs text-gray-500">{type === 'POLYGON' ? 'Operational Area' : 'Direction'}</p>
        </div>
      </div>
      {/* EDITING INPUTS */}
      <form className="flex flex-col gap-2 px-2 pb-4" onSubmit={(e) => e.preventDefault()}>
        <div className="flex justify-between gap-1">
          <label htmlFor="name" className="sr-only">
            Annotation name
          </label>
          <input type="text" id="name" className="w-auto px-1 py-1 text-sm" value="Annotation name" required />
          <div className="flex gap-1">
            <Button variant="link-success" size="xs">
              Save
            </Button>
            <Button variant="link-error" size="xs">
              Cancel
            </Button>
          </div>
        </div>
        <div className="flex justify-between gap-1">
          <label htmlFor="area" className="sr-only">
            Area type
          </label>
          <select id="area" className="px-1 py-1 text-sm">
            <option value="OPERATIONAL_AREA">Operational Area</option>
            <option value="PRODUCTION_LINE">Production Line</option>
            <option value="ASSEMBLY_AREA">Assembly Area</option>
            <option value="QUALITY_CONTROL">Quality Control</option>
            <option value="STORAGE_ZONE">Storage Zone</option>
            <option value="PACKAGING_AREA">Packaging Area</option>
          </select>
          <div className="flex gap-1">
            <Button variant="link-success" size="xs">
              Save
            </Button>
            <Button variant="link-error" size="xs">
              Cancel
            </Button>
          </div>
        </div>
      </form>
      {/* EO Annotation item */}
    </div>
  );
}
