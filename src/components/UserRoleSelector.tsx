import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { MessageSquare, Users, BookOpen, GraduationCap } from "lucide-react";

interface UserRoleSelectorProps {
  onRoleSelect: (role: "student" | "mentor") => void;
}

export function UserRoleSelector({ onRoleSelect }: UserRoleSelectorProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/10 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-12 w-12 bg-primary rounded-lg flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold">Retention Engine</h1>
          </div>
          <p className="text-lg text-muted-foreground">
            あなたの役割を選択してください
          </p>
        </div>

        {/* Role Selection Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Student Card */}
          <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-2 hover:border-primary/20">
            <CardHeader className="text-center pb-4">
              <div className="w-20 h-20 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <MessageSquare className="h-10 w-10 text-blue-600" />
              </div>
              <CardTitle className="text-2xl">若手社員</CardTitle>
              <CardDescription className="text-base">
                AIと対話して学習を進めましょう
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <span>AIチューターとのチャット</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <span>学習履歴の確認</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>質問とフィードバック</span>
                </div>
              </div>
              <Button
                className="w-full mt-6"
                size="lg"
                onClick={() => onRoleSelect("student")}
              >
                若手社員として開始
              </Button>
            </CardContent>
          </Card>

          {/* Mentor Card */}
          <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-2 hover:border-primary/20">
            <CardHeader className="text-center pb-4">
              <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Users className="h-10 w-10 text-green-600" />
              </div>
              <CardTitle className="text-2xl">メンター</CardTitle>
              <CardDescription className="text-base">
                若手社員の学習を指導し、AIの品質を向上させましょう
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>若手社員活動の監督</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <span>AIチャットの評価</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <span>知識ベースの管理</span>
                </div>
              </div>
              <Button
                className="w-full mt-6"
                size="lg"
                onClick={() => onRoleSelect("mentor")}
              >
                メンターとして開始
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Demo Users */}
        <div className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            デモ用アカウントでお試しいただけます
          </p>
          <div className="flex justify-center gap-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs">学</AvatarFallback>
              </Avatar>
              <span>体験若手社員</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs">先</AvatarFallback>
              </Avatar>
              <span>体験メンター</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
