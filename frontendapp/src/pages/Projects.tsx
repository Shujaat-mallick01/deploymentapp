import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, GitBranch, ExternalLink, Settings, Trash2, Search } from 'lucide-react'
import axios from 'axios'
import { toast } from 'sonner'
import { config } from '../config'

interface Project {
  id: string
  name: string
  fullName: string
  url: string
  defaultBranch: string
  connected: boolean
  lastDeployment?: string
  status?: 'active' | 'inactive'
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [repoUrl, setRepoUrl] = useState('')
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      const response = await axios.get(`${config.apiUrl}/api/git/repositories`)
      setProjects(response.data.repositories || [])
    } catch (error) {
      console.error('Failed to fetch projects:', error)
      toast.error('Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  const connectRepository = async () => {
    if (!repoUrl) {
      toast.error('Please enter a repository URL')
      return
    }

    setConnecting(true)
    try {
      await axios.post(`${config.apiUrl}/api/git/connect`, { repoUrl })
      toast.success('Repository connected successfully!')
      setShowAddDialog(false)
      setRepoUrl('')
      fetchProjects()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to connect repository')
    } finally {
      setConnecting(false)
    }
  }

  const disconnectRepository = async (projectId: string) => {
    try {
      await axios.delete(`${config.apiUrl}/api/git/disconnect/${projectId}`)
      toast.success('Repository disconnected')
      fetchProjects()
    } catch (error) {
      toast.error('Failed to disconnect repository')
    }
  }

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Projects</h2>
          <p className="text-muted-foreground">
            Manage your connected repositories and deployments
          </p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Connect Repository
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Connect a Repository</DialogTitle>
              <DialogDescription>
                Enter your repository URL to connect it to the deployment platform
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="repo-url">Repository URL</Label>
                <Input
                  id="repo-url"
                  placeholder="https://github.com/username/repository"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button onClick={connectRepository} disabled={connecting}>
                {connecting ? 'Connecting...' : 'Connect'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredProjects.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="relative">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    <CardDescription className="text-xs">
                      {project.fullName}
                    </CardDescription>
                  </div>
                  <Badge variant={project.connected ? 'default' : 'secondary'}>
                    {project.connected ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center text-sm text-muted-foreground">
                  <GitBranch className="mr-2 h-3 w-3" />
                  {project.defaultBranch}
                </div>
                {project.lastDeployment && (
                  <p className="text-sm text-muted-foreground">
                    Last deployed: {new Date(project.lastDeployment).toLocaleDateString()}
                  </p>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" size="sm" asChild>
                  <a href={project.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-3 w-3" />
                    View Repo
                  </a>
                </Button>
                <div className="space-x-2">
                  <Button variant="ghost" size="sm">
                    <Settings className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => disconnectRepository(project.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-8">
          <div className="text-center space-y-4">
            <GitBranch className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-medium">No projects found</h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery ? 'No projects match your search' : 'Connect your first repository to get started'}
            </p>
            {!searchQuery && (
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Connect Repository
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}