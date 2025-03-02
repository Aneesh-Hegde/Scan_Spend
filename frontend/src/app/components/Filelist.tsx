import { Button } from "@/components/ui/button"

interface FileListProps {
  files: string[]
  onFileClick: (filename: string) => void
}

export default function FileList({ files, onFileClick }: FileListProps) {
  return (
    <div className="mt-8">
      <h2 className="text-2xl font-semibold mb-4">Available Files</h2>
      {files.length === 0 ? (
        <p>No files available</p>
      ) : (
        <ul className="space-y-2">
          {files.map((file, index) => (
            <li key={index}>
              <Button variant="outline" onClick={() => onFileClick(file)}>
                {file}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

