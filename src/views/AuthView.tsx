import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Alert } from "../components/ui/alert";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { MbtiCardSelector } from "../components/MbtiCardSelector";
import { useState } from "react";
import { MBTI_LABELS } from "../domain/mbti.types";
import type {
  AuthPresenterInteractions,
  AuthPresenterStatus,
  AuthPresenterViewModel,
} from "../interfaceAdapters/presenters/useAuthPresenter";

/**
 * AuthView - V2 Architecture Compatible
 *
 * この View は Clean Architectureと互換性があります。
 * useAuthPresenter から提供される deprecated 型を使用していますが、
 * データ構造は V2 の AuthViewModel と同一です。
 *
 * @deprecated 型定義は useAuthPresenter.ts で deprecated とマークされていますが、
 * Clean Architectureとの互換性のために保持されています。
 */

interface AuthViewProps {
  viewModel: AuthPresenterViewModel;
  status: AuthPresenterStatus;
  interactions: AuthPresenterInteractions;
}

const AuthView = ({ viewModel, status, interactions }: AuthViewProps) => {
  const [isMbtiModalOpen, setIsMbtiModalOpen] = useState(false);

  return (
    <div className="space-y-8">
      <header className="space-y-2 text-center lg:text-left">
        <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
        <p className="text-muted-foreground">
          アカウントにログインするか、新しく作成してください。
        </p>
      </header>

      {status.error ? (
        <Alert
          variant="destructive"
          className="flex items-start justify-between gap-3 animate-in fade-in zoom-in-95"
        >
          <span>{status.error.message}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={interactions.clearError}
            className="h-auto p-0 hover:bg-transparent"
          >
            閉じる
          </Button>
        </Alert>
      ) : null}

      <Tabs defaultValue="login" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8 h-12 bg-muted/50 p-1">
          <TabsTrigger
            value="login"
            className="text-base data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
          >
            ログイン
          </TabsTrigger>
          <TabsTrigger
            value="register"
            className="text-base data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
          >
            新規登録
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="register"
          className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
        >
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              interactions.submitRegistration();
            }}
          >
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                メールアドレス
              </label>
              <Input
                type="email"
                autoComplete="email"
                value={viewModel.register.email}
                onChange={(event) =>
                  interactions.setRegisterField("email", event.target.value)
                }
                placeholder="you@example.com"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                パスワード
              </label>
              <Input
                type="password"
                autoComplete="new-password"
                value={viewModel.register.password}
                onChange={(event) =>
                  interactions.setRegisterField("password", event.target.value)
                }
                placeholder="8文字以上"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                氏名
              </label>
              <Input
                value={viewModel.register.displayName}
                autoComplete="name"
                onChange={(event) =>
                  interactions.setRegisterField(
                    "displayName",
                    event.target.value
                  )
                }
                placeholder="山田太郎"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="auth-register-role">役割</Label>
              <Select
                value={viewModel.register.role}
                onValueChange={(value) =>
                  interactions.setRegisterField("role", value)
                }
              >
                <SelectTrigger id="auth-register-role" className="h-11">
                  <SelectValue placeholder="役割を選択してください" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NEW_HIRE">新入社員</SelectItem>
                  <SelectItem value="MENTOR">メンター</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>MBTI性格タイプ</Label>
              <Dialog open={isMbtiModalOpen} onOpenChange={setIsMbtiModalOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between h-11 font-normal"
                  >
                    {viewModel.register.mbti
                      ? `${viewModel.register.mbti} - ${
                          MBTI_LABELS[viewModel.register.mbti]
                        }`
                      : "MBTIタイプを選択してください"}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>MBTI性格タイプを選択</DialogTitle>
                  </DialogHeader>
                  <div className="py-4">
                    <MbtiCardSelector
                      value={viewModel.register.mbti}
                      onChange={(value) => {
                        interactions.setRegisterField("mbti", value);
                        setIsMbtiModalOpen(false);
                      }}
                    />
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <Button
              type="submit"
              className="w-full h-11 text-base font-medium shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
              disabled={status.isSubmitting}
            >
              {status.isSubmitting ? "処理中..." : "アカウント作成"}
            </Button>
          </form>
        </TabsContent>

        <TabsContent
          value="login"
          className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
        >
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              interactions.submitLogin();
            }}
          >
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                メールアドレス
              </label>
              <Input
                type="email"
                autoComplete="email"
                value={viewModel.login.email}
                onChange={(event) =>
                  interactions.setLoginField("email", event.target.value)
                }
                placeholder="you@example.com"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  パスワード
                </label>
                <Button
                  variant="link"
                  className="px-0 font-normal h-auto text-xs text-muted-foreground"
                  type="button"
                >
                  パスワードをお忘れですか？
                </Button>
              </div>
              <Input
                type="password"
                autoComplete="current-password"
                value={viewModel.login.password}
                onChange={(event) =>
                  interactions.setLoginField("password", event.target.value)
                }
                placeholder="パスワード"
                className="h-11"
              />
            </div>
            <div className="flex flex-col gap-3 pt-2">
              <Button
                type="submit"
                className="w-full h-11 text-base font-medium shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
                disabled={status.isSubmitting}
              >
                {status.isSubmitting ? "処理中..." : "ログイン"}
              </Button>

              {viewModel.session && (
                <Button
                  type="button"
                  className="w-full h-11"
                  variant="outline"
                  onClick={interactions.submitLogout}
                  disabled={status.isSubmitting}
                >
                  ログアウト
                </Button>
              )}
            </div>

            {viewModel.session ? (
              <div className="rounded-lg border bg-muted/50 p-4 text-sm space-y-1 mt-4">
                <p className="font-semibold text-foreground">
                  現在のセッション
                </p>
                <div className="grid grid-cols-[80px_1fr] gap-1 text-muted-foreground">
                  <span>User ID:</span>{" "}
                  <span className="font-mono text-xs truncate">
                    {viewModel.session.userId}
                  </span>
                  <span>Role:</span> <span>{viewModel.session.role}</span>
                </div>
              </div>
            ) : null}
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AuthView;
