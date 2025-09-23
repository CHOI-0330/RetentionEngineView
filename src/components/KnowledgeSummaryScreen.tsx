import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { Search, Filter, BookOpen, Calendar, TrendingUp, Eye } from 'lucide-react';

interface KnowledgeEntry {
  id: string;
  title: string;
  description: string;
  subject: string;
  tags: string[];
  lastUpdated: Date;
  popularity: number;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  content: string;
  corrections: number;
}

export function KnowledgeSummaryScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [sortBy, setSortBy] = useState('popularity');
  const [selectedEntry, setSelectedEntry] = useState<KnowledgeEntry | null>(null);

  const knowledgeEntries: KnowledgeEntry[] = [
    {
      id: '1',
      title: 'Quadratic Formula - Complete Guide',
      description: 'Comprehensive explanation of the quadratic formula with step-by-step examples and practical applications.',
      subject: 'Mathematics',
      tags: ['Algebra', 'Formulas', 'Problem Solving', 'Quadratic Equations'],
      lastUpdated: new Date(Date.now() - 86400000), // 1 day ago
      popularity: 95,
      difficulty: 'Intermediate',
      content: `The quadratic formula is x = (-b ± √(b² - 4ac)) / 2a, where a, b, and c are coefficients from the standard form ax² + bx + c = 0. This powerful formula can solve any quadratic equation...`,
      corrections: 3
    },
    {
      id: '2',
      title: 'Photosynthesis Light Reactions',
      description: 'Detailed breakdown of light-dependent reactions in photosynthesis, including ATP and NADPH production.',
      subject: 'Biology',
      tags: ['Photosynthesis', 'Cellular Biology', 'Energy Conversion', 'Chloroplasts'],
      lastUpdated: new Date(Date.now() - 172800000), // 2 days ago
      popularity: 87,
      difficulty: 'Advanced',
      content: `Light reactions occur in the thylakoid membranes where chlorophyll absorbs light energy to produce ATP and NADPH...`,
      corrections: 2
    },
    {
      id: '3',
      title: 'Ionic Bonding Fundamentals',
      description: 'Understanding how ionic bonds form through electron transfer between metals and non-metals.',
      subject: 'Chemistry',
      tags: ['Chemical Bonds', 'Ionic Compounds', 'Electron Transfer', 'Periodic Table'],
      lastUpdated: new Date(Date.now() - 259200000), // 3 days ago
      popularity: 78,
      difficulty: 'Beginner',
      content: `Ionic bonds form when electrons are transferred from metal atoms to non-metal atoms, creating oppositely charged ions...`,
      corrections: 1
    },
    {
      id: '4',
      title: 'World War I Causes Analysis',
      description: 'In-depth examination of the complex factors that led to the outbreak of World War I.',
      subject: 'History',
      tags: ['World War I', 'Historical Analysis', 'European History', 'Causes of War'],
      lastUpdated: new Date(Date.now() - 345600000), // 4 days ago
      popularity: 72,
      difficulty: 'Intermediate',
      content: `World War I was caused by a complex web of factors including imperialism, alliance systems, and the assassination of Archduke Franz Ferdinand...`,
      corrections: 4
    },
    {
      id: '5',
      title: 'Newton\'s Laws of Motion',
      description: 'Comprehensive guide to understanding and applying Newton\'s three laws of motion with real-world examples.',
      subject: 'Physics',
      tags: ['Classical Mechanics', 'Forces', 'Motion', 'Newton\'s Laws'],
      lastUpdated: new Date(Date.now() - 432000000), // 5 days ago
      popularity: 89,
      difficulty: 'Intermediate',
      content: `Newton's three laws of motion form the foundation of classical mechanics. The first law states that an object at rest stays at rest...`,
      corrections: 2
    },
    {
      id: '6',
      title: 'DNA Replication Process',
      description: 'Step-by-step explanation of how DNA replicates during cell division.',
      subject: 'Biology',
      tags: ['DNA', 'Cell Division', 'Molecular Biology', 'Genetics'],
      lastUpdated: new Date(Date.now() - 518400000), // 6 days ago
      popularity: 91,
      difficulty: 'Advanced',
      content: `DNA replication is a semiconservative process where each strand of the double helix serves as a template...`,
      corrections: 3
    }
  ];

  const filteredEntries = knowledgeEntries
    .filter(entry => {
      const matchesSearch = entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           entry.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           entry.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesSubject = selectedSubject === 'all' || entry.subject === selectedSubject;
      return matchesSearch && matchesSubject;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'popularity':
          return b.popularity - a.popularity;
        case 'date':
          return b.lastUpdated.getTime() - a.lastUpdated.getTime();
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return 'bg-green-100 text-green-800';
      case 'Intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'Advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSubjectColor = (subject: string) => {
    const colors = {
      'Mathematics': 'bg-blue-100 text-blue-800',
      'Biology': 'bg-green-100 text-green-800',
      'Chemistry': 'bg-purple-100 text-purple-800',
      'Physics': 'bg-orange-100 text-orange-800',
      'History': 'bg-brown-100 text-brown-800',
    };
    return colors[subject as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-white px-4 py-4">
        <h1 className="mb-4">Knowledge Base</h1>
        
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search knowledge entries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-input-background border-0"
            />
          </div>
          
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="w-full sm:w-40 bg-input-background border-0">
              <SelectValue placeholder="Subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              <SelectItem value="Mathematics">Mathematics</SelectItem>
              <SelectItem value="Biology">Biology</SelectItem>
              <SelectItem value="Chemistry">Chemistry</SelectItem>
              <SelectItem value="Physics">Physics</SelectItem>
              <SelectItem value="History">History</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-36 bg-input-background border-0">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popularity">Popularity</SelectItem>
              <SelectItem value="date">Latest</SelectItem>
              <SelectItem value="title">Title</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Knowledge Grid */}
      <div className="p-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredEntries.map((entry) => (
            <Card key={entry.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-tight">{entry.title}</CardTitle>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <TrendingUp className="h-3 w-3" />
                    {entry.popularity}
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-1 mt-2">
                  <Badge variant="outline" className={`text-xs ${getSubjectColor(entry.subject)}`}>
                    {entry.subject}
                  </Badge>
                  <Badge variant="outline" className={`text-xs ${getDifficultyColor(entry.difficulty)}`}>
                    {entry.difficulty}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                  {entry.description}
                </p>
                
                <div className="flex flex-wrap gap-1 mb-3">
                  {entry.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {entry.tags.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{entry.tags.length - 3}
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(entry.lastUpdated)}
                  </div>
                  <div className="flex items-center gap-1">
                    <span>{entry.corrections} corrections</span>
                  </div>
                </div>
                
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full mt-3" onClick={() => setSelectedEntry(entry)}>
                      <Eye className="h-4 w-4 mr-2" />
                      View Content
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh]">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5" />
                        {entry.title}
                      </DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="max-h-[60vh] pr-4">
                      <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className={getSubjectColor(entry.subject)}>
                            {entry.subject}
                          </Badge>
                          <Badge variant="outline" className={getDifficultyColor(entry.difficulty)}>
                            {entry.difficulty}
                          </Badge>
                          <Badge variant="outline">
                            {entry.popularity}% popularity
                          </Badge>
                        </div>
                        
                        <div className="flex flex-wrap gap-1">
                          {entry.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        
                        <div className="prose prose-sm max-w-none">
                          <p className="text-muted-foreground mb-4">{entry.description}</p>
                          <div className="bg-muted/50 rounded-lg p-4">
                            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                              {entry.content}
                            </pre>
                          </div>
                        </div>
                        
                        <div className="text-xs text-muted-foreground border-t pt-4">
                          Last updated: {entry.lastUpdated.toLocaleDateString()} • {entry.corrections} corrections applied
                        </div>
                      </div>
                    </ScrollArea>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredEntries.length === 0 && (
          <Card className="p-8 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">No knowledge entries found</h3>
            <p className="text-muted-foreground">
              {searchQuery || selectedSubject !== 'all' 
                ? 'Try adjusting your search filters'
                : 'Start creating knowledge entries to see them here'
              }
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}