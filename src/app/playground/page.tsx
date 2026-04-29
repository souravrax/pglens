'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from 'zustand'
import { playgroundStore } from '@/lib/playground-store'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { FlaskConical, Plus, Trash2, FileCode2 } from 'lucide-react'
import { ModeToggle } from '@/components/mode-toggle'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export default function PlaygroundDashboardPage() {
  const router = useRouter()
  const projects = useStore(playgroundStore, (s) => s.projects)
  const cells = useStore(playgroundStore, (s) => s.cells)
  const createProject = useStore(playgroundStore, (s) => s.createProject)
  const deleteProject = useStore(playgroundStore, (s) => s.deleteProject)

  const [newProjectName, setNewProjectName] = useState('')
  const [showNewProject, setShowNewProject] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null)

  const handleCreate = () => {
    if (!newProjectName.trim()) return
    const id = createProject(newProjectName.trim())
    setShowNewProject(false)
    setNewProjectName('')
    router.push(`/playground/${id}`)
  }

  return (
    <div className="flex min-h-screen flex-col items-center">
      <header className="flex py-2 shrink-0 items-center gap-3 px-6 sticky top-0 z-10 bg-background/50 backdrop-blur-xl max-w-4xl w-full">
        <div className="flex items-center gap-2">
          <FlaskConical className="size-4 text-primary" />
          <span className="text-sm font-semibold tracking-tight">pgviz</span>
          <span className="text-xs text-muted-foreground">Playground</span>
        </div>
        <div className="ml-auto">
          <ModeToggle />
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center px-6 py-16 w-full">
        <div className="w-full max-w-4xl">
          <div className="mb-12 text-center">
            <div className="flex items-center gap-2 flex-col">
              <div className="flex p-4 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <FlaskConical className="size-8" />
              </div>
              <h1 className="mb-2 text-2xl font-bold tracking-tight">Migration Playground</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Create projects to write and test PostgreSQL migrations in a safe sandbox
            </p>
          </div>

          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Projects</h2>
            <Button onClick={() => setShowNewProject(true)}>
              <Plus className="size-4 mr-1.5" />
              New Project
            </Button>
          </div>

          {projects.length === 0 && (
            <div className="rounded-lg border border-dashed p-10 text-center">
              <FileCode2 className="mx-auto mb-3 size-8 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">No projects yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Create a project to start writing SQL migrations
              </p>
            </div>
          )}

          {projects.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {projects.map((project) => {
                const projectCells = cells.filter((c) => c.projectId === project.id)
                const successCount = projectCells.filter((c) => c.status === 'success').length
                return (
                  <Card
                    key={project.id}
                    className="cursor-pointer hover:border-primary/30 transition-colors"
                    onClick={() => router.push(`/playground/${project.id}`)}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileCode2 className="size-4 text-muted-foreground" />
                        {project.name}
                      </CardTitle>
                      <CardDescription>
                        {projectCells.length} cell{projectCells.length !== 1 ? 's' : ''}
                        {projectCells.length > 0 && (
                          <span className="ml-1">· {successCount} applied</span>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardFooter className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          setProjectToDelete(project.id)
                        }}
                      >
                        <Trash2 className="size-4" />
                        <span className="sr-only">Remove project</span>
                      </Button>
                    </CardFooter>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </main>

      <Dialog
        open={showNewProject}
        onOpenChange={setShowNewProject}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
            <DialogDescription>
              Create a new sandbox project to write and test migrations.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <input
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate()
                if (e.key === 'Escape') setShowNewProject(false)
              }}
              placeholder="Project name"
              autoFocus
              className="w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/50"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNewProject(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newProjectName.trim()}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!projectToDelete}
        onOpenChange={(open) => !open && setProjectToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              This will permanently delete the project and all its cells. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setProjectToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (projectToDelete) {
                  deleteProject(projectToDelete)
                  setProjectToDelete(null)
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
