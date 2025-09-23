import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Separator } from './ui/separator';
import { Save, Tag, Upload, Bold, Italic, Underline, Highlighter } from 'lucide-react';

export function KnowledgeCorrectionScreen() {
  const [correctedText, setCorrectedText] = useState('');
  const [tags, setTags] = useState<string[]>(['数学', '二次方程式']);
  const [newTag, setNewTag] = useState('');
  const [subject, setSubject] = useState('数学');
  const [difficulty, setDifficulty] = useState('中級');

  const originalAIOutput = `二次方程式の公式は x = (-b ± √(b² - 4ac)) / 2a です。この公式は ax² + bx + c = 0 の形のあらゆる二次方程式を解くのに使用できます。

例えば、x² - 5x + 6 = 0 を解く場合：
- a = 1, b = -5, c = 6
- x = (5 ± √(25 - 24)) / 2
- x = (5 ± 1) / 2
- x = 3 または x = 2

この方法は因数分解が困難な場合でも、すべての二次方程式に有効です。`;

  const suggestedCorrection = `二次方程式の公式は x = (-b ± √(b² - 4ac)) / 2a で、a、b、c は標準形 ax² + bx + c = 0 の係数です。この強力な公式は因数分解が困難な場合でも、あらゆる二次方程式を解くことができます。

**x² - 5x + 6 = 0 の段階的解法:**

1. **係数の特定:** a = 1, b = -5, c = 6
2. **公式への代入:** x = (-(-5) ± √((-5)² - 4(1)(6))) / 2(1)
3. **簡略化:** x = (5 ± √(25 - 24)) / 2 = (5 ± √1) / 2 = (5 ± 1) / 2
4. **解の計算:** x = (5 + 1)/2 = 3 または x = (5 - 1)/2 = 2

**検証:** 代入して確認: (3)² - 5(3) + 6 = 9 - 15 + 6 = 0 ✓

**使用場面:** 二次方程式の公式は特に以下の場合に有用です：
- 方程式が簡単に因数分解できない
- 正確な解が必要（近似値ではなく）
- 複素数を扱う場合（判別式 < 0の時）

**コツ:** 解の性質を判断するために、まず判別式（b² - 4ac）を確認しましょう。`;

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSave = () => {
    console.log('Saving correction:', {
      originalText: originalAIOutput,
      correctedText: correctedText || suggestedCorrection,
      tags,
      subject,
      difficulty
    });
    // Here you would save to your data store
  };

  const handlePublish = () => {
    console.log('Publishing to knowledge base');
    // Here you would publish to the knowledge base
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-white px-4 py-4">
        <div className="flex items-center justify-between">
          <h1>知識添削エディター</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              下書き保存
            </Button>
            <Button onClick={handlePublish}>
              <Upload className="h-4 w-4 mr-2" />
              公開
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Original AI Output */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                元のAI出力
                <Badge variant="outline">読み取り専用</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 rounded-lg p-4 h-96 overflow-auto">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                  {originalAIOutput}
                </pre>
              </div>
            </CardContent>
          </Card>

          {/* Correction Editor */}
          <Card>
            <CardHeader>
              <CardTitle>添削版</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Bold className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <Italic className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <Underline className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <Highlighter className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={correctedText || suggestedCorrection}
                onChange={(e) => setCorrectedText(e.target.value)}
                placeholder="添削した内容をここに入力してください..."
                className="h-96 resize-none font-sans"
              />
            </CardContent>
          </Card>
        </div>

        {/* Metadata Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>分類とメタデータ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">科目</label>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="数学">数学</SelectItem>
                    <SelectItem value="生物">生物</SelectItem>
                    <SelectItem value="化学">化学</SelectItem>
                    <SelectItem value="物理">物理</SelectItem>
                    <SelectItem value="歴史">歴史</SelectItem>
                    <SelectItem value="文学">文学</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">難易度</label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="初級">初級</SelectItem>
                    <SelectItem value="中級">中級</SelectItem>
                    <SelectItem value="上級">上級</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <label className="text-sm font-medium">タグ</label>
              
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                    {tag} ×
                  </Badge>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="タグを追加..."
                  className="max-w-xs"
                  onKeyPress={(e) => e.key === 'Enter' && addTag()}
                />
                <Button variant="outline" onClick={addTag}>
                  <Tag className="h-4 w-4 mr-2" />
                  Add Tag
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <span className="text-sm text-muted-foreground">Suggested:</span>
                {['Algebra', 'Problem Solving', 'Formulas', 'Examples'].map((suggestion) => (
                  <Button
                    key={suggestion}
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => {
                      if (!tags.includes(suggestion)) {
                        setTags([...tags, suggestion]);
                      }
                    }}
                  >
                    + {suggestion}
                  </Button>
                ))}
              </div>
            </div>

            <div className="bg-accent/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Correction Summary</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Added step-by-step formatting with clear headers</li>
                <li>• Included verification step to check solutions</li>
                <li>• Added context for when to use the quadratic formula</li>
                <li>• Improved mathematical notation and clarity</li>
                <li>• Added pro tip about discriminant analysis</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}