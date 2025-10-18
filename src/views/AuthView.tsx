import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Alert } from "../components/ui/alert";
import type { AuthPresenterInteractions, AuthPresenterStatus, AuthPresenterViewModel } from "../interfaceAdapters/presenters/useAuthPresenter";

interface AuthViewProps {
  viewModel: AuthPresenterViewModel;
  status: AuthPresenterStatus;
  interactions: AuthPresenterInteractions;
}

const AuthView = ({ viewModel, status, interactions }: AuthViewProps) => {
  return (
    <div className="mx-auto max-w-md space-y-6 rounded-2xl border bg-card p-6 shadow-sm">
      <header className="space-y-2">
        <h1 className="text-xl font-semibold">Entitle アカウント</h1>
        <p className="text-sm text-muted-foreground">新入社員・メンターのアカウントを作成またはログインしてください。</p>
      </header>

      {status.error ? (
        <Alert variant="destructive" className="flex items-start justify-between gap-3">
          <span>{status.error.message}</span>
          <Button variant="ghost" size="sm" onClick={interactions.clearError}>
            閉じる
          </Button>
        </Alert>
      ) : null}

      <Tabs defaultValue="register" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="register">新規登録</TabsTrigger>
          <TabsTrigger value="login">ログイン</TabsTrigger>
        </TabsList>

        <TabsContent value="register" className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">メールアドレス</label>
            <Input
              type="email"
              value={viewModel.register.email}
              onChange={(event) => interactions.setRegisterField("email", event.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">パスワード</label>
            <Input
              type="password"
              value={viewModel.register.password}
              onChange={(event) => interactions.setRegisterField("password", event.target.value)}
              placeholder="8文字以上"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">氏名</label>
            <Input
              value={viewModel.register.displayName}
              onChange={(event) => interactions.setRegisterField("displayName", event.target.value)}
              placeholder="山田太郎"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">役割</label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={viewModel.register.role}
              onChange={(event) => interactions.setRegisterField("role", event.target.value)}
            >
              <option value="NEW_HIRE">新入社員</option>
              <option value="MENTOR">メンター</option>
            </select>
          </div>
          <Button className="w-full" onClick={interactions.submitRegistration} disabled={status.isSubmitting}>
            {status.isSubmitting ? "処理中..." : "新規登録"}
          </Button>
        </TabsContent>

        <TabsContent value="login" className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">メールアドレス</label>
            <Input
              type="email"
              value={viewModel.login.email}
              onChange={(event) => interactions.setLoginField("email", event.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">パスワード</label>
            <Input
              type="password"
              value={viewModel.login.password}
              onChange={(event) => interactions.setLoginField("password", event.target.value)}
              placeholder="パスワード"
            />
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={interactions.submitLogin} disabled={status.isSubmitting}>
              {status.isSubmitting ? "処理中..." : "ログイン"}
            </Button>
            <Button
              className="flex-1"
              variant="secondary"
              onClick={interactions.submitLogout}
              disabled={status.isSubmitting || !viewModel.session}
            >
              ログアウト
            </Button>
          </div>
          {viewModel.session ? (
            <div className="rounded-md border border-dashed bg-muted/30 p-3 text-xs">
              <p className="font-medium">ログイン情報</p>
              <p>ユーザーID: {viewModel.session.userId}</p>
              <p>役割: {viewModel.session.role}</p>
            </div>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AuthView;
