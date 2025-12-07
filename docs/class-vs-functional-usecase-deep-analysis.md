# Clean Architecture UseCase 레이어: 클래스 기반 vs 함수형 접근법 심층 분석

## 목차
1. [SOLID 원칙 준수 측면](#1-solid-원칙-준수-측면)
2. [함수형 프로그래밍 원칙 측면](#2-함수형-프로그래밍-원칙-측면)
3. [실용적 측면](#3-실용적-측면)
4. [현대적 트렌드](#4-현대적-트렌드)
5. [종합 평가 및 권장사항](#5-종합-평가-및-권장사항)

---

## 1. SOLID 원칙 준수 측면

### 1.1 단일 책임 원칙 (SRP)

#### 클래스 기반 접근법
```typescript
// ✅ 장점: 명확한 책임 경계
class GetUserUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute(id: string): Promise<User> {
    return this.userRepository.getUser(id);
  }
}

class CreateUserUseCase {
  constructor(
    private userRepository: UserRepository,
    private emailService: EmailService
  ) {}

  async execute(data: CreateUserDTO): Promise<User> {
    const user = await this.userRepository.create(data);
    await this.emailService.sendWelcomeEmail(user.email);
    return user;
  }
}
```

**장점:**
- 클래스 하나당 하나의 UseCase, 명확한 책임 분리
- 의존성이 생성자에 명시되어 책임 범위가 가시적
- 클래스 이름 자체가 UseCase의 목적을 표현

**단점:**
- "Useless proxy class" 문제 - 단순 위임만 하는 클래스 증가
- 예: `GetSearchContentsCountUseCase`처럼 불필요한 래퍼 클래스 생성

#### 함수형 접근법
```typescript
// ✅ 장점: 간결하고 직접적
type GetUser = (id: string) => Promise<User>;

const makeGetUser = (userRepository: UserRepository): GetUser => {
  return async (id: string) => {
    return userRepository.getUser(id);
  };
};

type CreateUser = (data: CreateUserDTO) => Promise<User>;

const makeCreateUser = (
  userRepository: UserRepository,
  emailService: EmailService
): CreateUser => {
  return async (data: CreateUserDTO) => {
    const user = await userRepository.create(data);
    await emailService.sendWelcomeEmail(user.email);
    return user;
  };
};
```

**장점:**
- 불필요한 래퍼 제거, 순수 로직에만 집중
- 함수 시그니처가 책임을 명확히 표현
- "Fluent and functional approach" - 자연어처럼 읽힘

**단점:**
- 복잡한 UseCase에서 관련 로직이 분산될 수 있음
- 명시적인 경계(클래스)가 없어 책임 범위 판단이 어려울 수 있음

**출처:**
- [Transforming UseCase: Embracing Fluent and Functional Approach](https://proandroiddev.com/transforming-usecase-embracing-fluent-and-functional-approach-2023-eba69d2117d6)
- [Breaking SOLID principles and Clean Architecture Discussion](https://github.com/android/nowinandroid/discussions/1273)

---

### 1.2 개방-폐쇄 원칙 (OCP)

#### 클래스 기반 접근법
```typescript
// ✅ 장점: 상속과 다형성으로 확장
abstract class BaseUseCase<TRequest, TResponse> {
  abstract execute(request: TRequest): Promise<TResponse>;
}

class GetUserUseCase extends BaseUseCase<string, User> {
  constructor(private userRepository: UserRepository) {
    super();
  }

  async execute(id: string): Promise<User> {
    return this.userRepository.getUser(id);
  }
}

// 확장: 기존 코드 수정 없이 기능 추가
class GetUserWithCacheUseCase extends GetUserUseCase {
  constructor(
    userRepository: UserRepository,
    private cache: CacheService
  ) {
    super(userRepository);
  }

  async execute(id: string): Promise<User> {
    const cached = await this.cache.get(`user:${id}`);
    if (cached) return cached;

    const user = await super.execute(id);
    await this.cache.set(`user:${id}`, user);
    return user;
  }
}
```

**장점:**
- 템플릿 메서드 패턴, 데코레이터 패턴 적용 용이
- 상속 체계로 확장 지점이 명확
- OOP 패턴과 자연스럽게 호환

**단점:**
- 상속 계층이 깊어질 수 있음
- 클래스 폭발(class explosion) 위험

#### 함수형 접근법
```typescript
// ✅ 장점: 합성으로 확장
type UseCase<TRequest, TResponse> = (req: TRequest) => Promise<TResponse>;

const withCache = <TRequest, TResponse>(
  useCase: UseCase<TRequest, TResponse>,
  cache: CacheService,
  keyFn: (req: TRequest) => string
): UseCase<TRequest, TResponse> => {
  return async (request: TRequest) => {
    const key = keyFn(request);
    const cached = await cache.get(key);
    if (cached) return cached;

    const result = await useCase(request);
    await cache.set(key, result);
    return result;
  };
};

const withLogging = <TRequest, TResponse>(
  useCase: UseCase<TRequest, TResponse>,
  logger: Logger
): UseCase<TRequest, TResponse> => {
  return async (request: TRequest) => {
    logger.log('Executing usecase', request);
    const result = await useCase(request);
    logger.log('UseCase completed', result);
    return result;
  };
};

const withValidation = <TRequest, TResponse>(
  useCase: UseCase<TRequest, TResponse>,
  validator: (req: TRequest) => boolean
) => {
  return async (request: TRequest) => {
    if (!validator(request)) {
      throw new Error("Validation failed");
    }
    return useCase(request);
  };
};

// 파이프라인으로 합성
import { pipe } from "fp-ts/function";

const enhancedGetUser = pipe(
  makeGetUser(repo),
  withValidation((id) => id.length > 0),
  withRetry(3),
  withLogging
);

// Effect로 더 강력한 합성
import { Effect, pipe } from "effect";

const getUserEffect = (id: string) => pipe(
  Effect.succeed(id),
  Effect.tap(() => Effect.log("Getting user")),
  Effect.flatMap((id) => getUserFromRepo(id)),
  Effect.retry({ times: 3 }),
  Effect.catchAll((error) => Effect.fail(new UserNotFoundError({ cause: error })))
);
```

**장점:**
- 무한한 합성 가능성
- 함수 조합으로 복잡한 로직 구축
- pipe, flow로 가독성 있는 체이닝

**단점:**
- 합성 순서가 중요 (실수 가능)
- TypeScript 타입 추론 한계

**출처:**
- [Next.js Clean Architecture - OCP Implementation](https://dev.to/behnamrhp/stop-spaghetti-code-how-clean-architecture-saves-nextjs-projects-4l18)

---

### 1.3 의존성 역전 원칙 (DIP)

#### 클래스 기반 접근법
```typescript
// Repository 인터페이스 (Domain Layer)
interface UserRepository {
  getUser(id: string): Promise<User>;
  create(data: CreateUserDTO): Promise<User>;
}

// UseCase (Domain Layer)
class GetUserUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute(id: string): Promise<User> {
    return this.userRepository.getUser(id);
  }
}

// Repository 구현 (Data Layer)
class PostgresUserRepository implements UserRepository {
  async getUser(id: string): Promise<User> {
    // PostgreSQL specific implementation
  }

  async create(data: CreateUserDTO): Promise<User> {
    // PostgreSQL specific implementation
  }
}

// DI Container
container.bind<UserRepository>(TYPES.UserRepository)
  .to(PostgresUserRepository);
```

**장점:**
- 인터페이스를 통한 명시적 계약
- DI 컨테이너와 완벽한 호환 (Inversify, TSyringe)
- 타입 안전성 보장
- Reflection 기반 자동 주입 가능

**단점:**
- 보일러플레이트 코드 증가
- DI 컨테이너 설정 복잡도

#### 함수형 접근법
```typescript
// Effect-TS Layer 기반 DI
import { Effect, Layer, Context } from "effect";

// Service 정의
class UserRepository extends Context.Tag("UserRepository")<
  UserRepository,
  {
    getUser: (id: string) => Effect.Effect<User, DatabaseError>;
    create: (data: CreateUserDTO) => Effect.Effect<User, DatabaseError>;
  }
>() {}

// UseCase 정의
const makeGetUser = Effect.gen(function* (_) {
  const repo = yield* _(UserRepository);

  return (id: string) => repo.getUser(id);
});

// Layer로 구현 제공
const PostgresUserRepositoryLive = Layer.succeed(UserRepository, {
  getUser: (id) => Effect.tryPromise({
    try: () => db.query("SELECT * FROM users WHERE id = $1", [id]),
    catch: (error) => new DatabaseError({ cause: error })
  }),
  create: (data) => Effect.tryPromise({
    try: () => db.query("INSERT INTO users ...", [data]),
    catch: (error) => new DatabaseError({ cause: error })
  })
});

// 실행
const program = Effect.gen(function* (_) {
  const getUser = yield* _(makeGetUser);
  return yield* _(getUser("user-123"));
});

Effect.runPromise(
  program.pipe(Effect.provide(PostgresUserRepositoryLive))
);
```

**장점:**
- **컴파일 타임 DI 검증** - 런타임 에러 방지
- Layer 기반 계층적 의존성 관리
- 함수형 + 서비스 기반 DI 혼용 가능
- Annotation이나 Reflection 불필요

**단점:**
- Effect-TS 학습 곡선
- 기존 OOP 팀에게는 낯선 패러다임

**출처:**
- [Why use Effect? 5 compelling reasons](https://tobyhobson.com/posts/effect/why-effect/)
- [Functional Dependency Injection in TypeScript](https://hassannteifeh.medium.com/functional-dependency-injection-in-typescript-4c2739326f57)
- [fp-ts and Effect-TS Merger](https://github.com/gcanti/fp-ts)

---

## 2. 함수형 프로그래밍 원칙 측면

### 2.1 순수 함수

#### 클래스 기반 접근법
```typescript
// ❌ 문제: 내부 상태 변경 가능
class CreateOrderUseCase {
  private orderCount = 0; // 가변 상태

  constructor(private orderRepository: OrderRepository) {}

  async execute(data: CreateOrderDTO): Promise<Order> {
    this.orderCount++; // 부수 효과
    return this.orderRepository.create(data);
  }
}

// ✅ 개선: 상태 없는 클래스
class CreateOrderUseCase {
  constructor(private orderRepository: OrderRepository) {}

  async execute(data: CreateOrderDTO): Promise<Order> {
    // 순수 로직, 부수 효과는 repository에 위임
    return this.orderRepository.create(data);
  }
}
```

**장점:**
- 규칙을 따르면 순수 함수 구현 가능
- private 필드 사용 제한으로 강제 가능

**단점:**
- 가변 상태 사용 유혹이 존재
- 팀 컨벤션 의존적

#### 함수형 접근법
```typescript
// ✅ 기본적으로 순수 함수
type CreateOrder = (data: CreateOrderDTO) => Promise<Order>;

const makeCreateOrder = (
  orderRepository: OrderRepository
): CreateOrder => {
  return (data: CreateOrderDTO) => {
    // 함수 내부에 상태 없음, 외부 의존성만 사용
    return orderRepository.create(data);
  };
};

// Effect로 부수 효과 명시
import { Effect } from "effect";

const createOrder = (
  data: CreateOrderDTO
): Effect.Effect<Order, DatabaseError, OrderRepository> => {
  return Effect.gen(function* (_) {
    const repo = yield* _(OrderRepository);
    return yield* _(repo.create(data));
  });
};
```

**장점:**
- 가변 상태 사용이 구조적으로 어려움
- Effect 타입으로 부수 효과가 타입에 명시됨
- 참조 투명성(referential transparency) 보장

**단점:**
- 비동기 로직이 복잡해지면 콜백 지옥 가능성

**출처:**
- [Functional approaches to dependency injection](https://fsharpforfunandprofit.com/posts/dependency-injection-1/)

---

### 2.2 불변성

#### 클래스 기반 접근법
```typescript
// ⚠️ 주의: readonly로 불변성 강제 필요
class UpdateUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly emailService: EmailService
  ) {}

  async execute(id: string, updates: Partial<User>): Promise<User> {
    const user = await this.userRepository.getUser(id);

    // ❌ 직접 수정 방지
    // user.email = updates.email;

    // ✅ 새 객체 생성
    const updatedUser = { ...user, ...updates };
    return this.userRepository.update(id, updatedUser);
  }
}
```

**장점:**
- TypeScript의 `readonly` 키워드로 강제 가능
- 명시적인 불변성 표현

**단점:**
- 개발자의 규칙 준수에 의존
- 런타임에는 여전히 변경 가능

#### 함수형 접근법
```typescript
// ✅ 구조적으로 불변성 유도
type UpdateUser = (
  id: string,
  updates: Partial<User>
) => Promise<User>;

const makeUpdateUser = (
  userRepository: UserRepository,
  emailService: EmailService
): UpdateUser => {
  return async (id, updates) => {
    const user = await userRepository.getUser(id);

    // 함수형 스타일: 항상 새 객체 반환
    const updatedUser = { ...user, ...updates };
    return userRepository.update(id, updatedUser);
  };
};

// immer 라이브러리 활용
import { produce } from "immer";

const makeUpdateUser = (repo: UserRepository) => {
  return async (id: string, updates: Partial<User>) => {
    const user = await repo.getUser(id);

    const updatedUser = produce(user, (draft) => {
      Object.assign(draft, updates);
    });

    return repo.update(id, updatedUser);
  };
};
```

**장점:**
- 함수형 패러다임에서 불변성이 기본값
- immer 같은 라이브러리로 편리한 불변 업데이트
- 예측 가능한 데이터 흐름

**단점:**
- 성능 오버헤드 (대량 데이터 처리 시)
- 메모리 사용량 증가

---

### 2.3 합성 가능성

#### 클래스 기반 접근법
```typescript
// ⚠️ 제한적인 합성
class BaseUseCase<TRequest, TResponse> {
  async execute(request: TRequest): Promise<TResponse> {
    throw new Error("Not implemented");
  }
}

// 데코레이터 패턴으로 합성
class LoggingDecorator<TRequest, TResponse> extends BaseUseCase<TRequest, TResponse> {
  constructor(private useCase: BaseUseCase<TRequest, TResponse>) {
    super();
  }

  async execute(request: TRequest): Promise<TResponse> {
    console.log("Before execution");
    const result = await this.useCase.execute(request);
    console.log("After execution");
    return result;
  }
}

const getUser = new GetUserUseCase(repo);
const loggedGetUser = new LoggingDecorator(getUser);
```

**장점:**
- 익숙한 OOP 패턴
- 타입 안전성 유지

**단점:**
- 클래스 래핑으로 보일러플레이트 증가
- 합성 체인이 길어지면 타입 추론 어려움

#### 함수형 접근법
```typescript
// ✅ 자유로운 함수 합성
type UseCase<TRequest, TResponse> = (req: TRequest) => Promise<TResponse>;

// Higher-order function으로 기능 추가
const withLogging = <TRequest, TResponse>(
  useCase: UseCase<TRequest, TResponse>
) => {
  return async (request: TRequest) => {
    console.log("Before execution", request);
    const result = await useCase(request);
    console.log("After execution", result);
    return result;
  };
};

const withRetry = <TRequest, TResponse>(
  useCase: UseCase<TRequest, TResponse>,
  maxRetries: number = 3
) => {
  return async (request: TRequest) => {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await useCase(request);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
  };
};

const withValidation = <TRequest, TResponse>(
  useCase: UseCase<TRequest, TResponse>,
  validator: (req: TRequest) => boolean
) => {
  return async (request: TRequest) => {
    if (!validator(request)) {
      throw new Error("Validation failed");
    }
    return useCase(request);
  };
};

// 파이프라인으로 합성
import { pipe } from "fp-ts/function";

const enhancedGetUser = pipe(
  makeGetUser(repo),
  withValidation((id) => id.length > 0),
  withRetry(3),
  withLogging
);

// Effect로 더 강력한 합성
import { Effect, pipe } from "effect";

const getUserEffect = (id: string) => pipe(
  Effect.succeed(id),
  Effect.tap(() => Effect.log("Getting user")),
  Effect.flatMap((id) => getUserFromRepo(id)),
  Effect.retry({ times: 3 }),
  Effect.catchAll((error) => Effect.fail(new UserNotFoundError({ cause: error })))
);
```

**장점:**
- 무한한 합성 가능성
- 함수 조합으로 복잡한 로직 구축
- pipe, flow로 가독성 있는 체이닝

**단점:**
- 합성 순서가 중요 (실수 가능)
- TypeScript 타입 추론 한계

**출처:**
- [React + TypeScript Clean Architecture](https://github.com/bespoyasov/frontend-clean-architecture)

---

## 3. 실용적 측면

### 3.1 테스트 작성 용이성

#### 클래스 기반 접근법
```typescript
// UseCase
class CreateUserUseCase {
  constructor(
    private userRepository: UserRepository,
    private emailService: EmailService,
    private dateTimeProvider: IDateTimeProvider
  ) {}

  async execute(data: CreateUserDTO): Promise<User> {
    const now = this.dateTimeProvider.utcNow();
    const user = await this.userRepository.create({
      ...data,
      createdAt: now
    });
    await this.emailService.sendWelcomeEmail(user.email);
    return user;
  }
}

// ❌ 문제점: 생성자 시그니처 변경 시 모든 테스트 수정
describe("CreateUserUseCase", () => {
  it("should create user", async () => {
    const mockRepo = mock<UserRepository>();
    const mockEmail = mock<EmailService>();
    const mockDateTime = mock<IDateTimeProvider>();

    const useCase = new CreateUserUseCase(mockRepo, mockEmail, mockDateTime);
    // ...
  });

  it("should send welcome email", async () => {
    const mockRepo = mock<UserRepository>();
    const mockEmail = mock<EmailService>();
    const mockDateTime = mock<IDateTimeProvider>(); // 이 테스트와 무관해도 필요

    const useCase = new CreateUserUseCase(mockRepo, mockEmail, mockDateTime);
    // ...
  });
});

// ✅ 개선: Test Builder 패턴
class CreateUserUseCaseBuilder {
  private userRepository = mock<UserRepository>();
  private emailService = mock<EmailService>();
  private dateTimeProvider = mock<IDateTimeProvider>();

  withUserRepository(repo: UserRepository) {
    this.userRepository = repo;
    return this;
  }

  withEmailService(email: EmailService) {
    this.emailService = email;
    return this;
  }

  build() {
    return new CreateUserUseCase(
      this.userRepository,
      this.emailService,
      this.dateTimeProvider
    );
  }
}

describe("CreateUserUseCase", () => {
  it("should send welcome email", async () => {
    const mockEmail = mock<EmailService>();

    const useCase = new CreateUserUseCaseBuilder()
      .withEmailService(mockEmail)
      .build();

    // Test logic
  });
});
```

**장점:**
- 명확한 테스트 구조
- Mock 객체 관리가 명시적

**단점:**
- Shotgun Surgery - 생성자 변경 시 모든 테스트 수정
- Test Builder 패턴 필요 (추가 코드)
- 무관한 의존성도 모킹 필요

#### 함수형 접근법
```typescript
// UseCase
type CreateUser = (data: CreateUserDTO) => Promise<User>;

const makeCreateUser = (deps: {
  userRepository: UserRepository;
  emailService: EmailService;
  dateTimeProvider: IDateTimeProvider;
}): CreateUser => {
  return async (data) => {
    const now = deps.dateTimeProvider.utcNow();
    const user = await deps.userRepository.create({
      ...data,
      createdAt: now
    });
    await deps.emailService.sendWelcomeEmail(user.email);
    return user;
  };
};

// ✅ 장점: 필요한 의존성만 모킹
describe("createUser", () => {
  it("should send welcome email", async () => {
    const mockEmail = mock<EmailService>();

    const createUser = makeCreateUser({
      userRepository: mock<UserRepository>(),
      emailService: mockEmail,
      dateTimeProvider: mock<IDateTimeProvider>()
    });

    await createUser({ name: "John", email: "john@example.com" });

    expect(mockEmail.sendWelcomeEmail).toHaveBeenCalledWith("john@example.com");
  });

  // 의존성 추가 시 기존 테스트에 영향 없음
  it("should create user with current time", async () => {
    const mockDateTime = {
      utcNow: () => new Date("2024-01-01")
    };

    const createUser = makeCreateUser({
      userRepository: mock<UserRepository>(),
      emailService: mock<EmailService>(),
      dateTimeProvider: mockDateTime
    });

    // Test logic
  });
});

// Effect로 더 간단한 테스트
describe("createUserEffect", () => {
  it("should create user", async () => {
    const testLayer = Layer.succeed(UserRepository, {
      create: (data) => Effect.succeed({ id: "123", ...data })
    });

    const result = await Effect.runPromise(
      createUserEffect({ name: "John" }).pipe(
        Effect.provide(testLayer)
      )
    );

    expect(result.id).toBe("123");
  });
});
```

**장점:**
- 부분 적용(partial application)으로 유연한 테스트
- 의존성 변경 시 영향 범위 최소화
- Fake 객체 사용이 자연스러움

**단점:**
- Mock 라이브러리 없이는 수동 구현 필요
- 복잡한 의존성 그래프는 관리 어려움

**출처:**
- [Unit Testing Clean Architecture Use Cases](https://www.milanjovanovic.tech/blog/unit-testing-clean-architecture-use-cases)
- [Clean Architecture UseCase Tests](https://www.entropywins.wtf/blog/2018/08/01/clean-architecture-usecase-tests/)

---

### 3.2 모킹/스터빙

#### 클래스 기반 접근법
```typescript
// 인터페이스 기반 모킹
interface UserRepository {
  getUser(id: string): Promise<User>;
  create(data: CreateUserDTO): Promise<User>;
}

// Jest Mock
const mockUserRepository: jest.Mocked<UserRepository> = {
  getUser: jest.fn(),
  create: jest.fn()
};

// 테스트
it("should get user", async () => {
  mockUserRepository.getUser.mockResolvedValue({
    id: "123",
    name: "John"
  });

  const useCase = new GetUserUseCase(mockUserRepository);
  const user = await useCase.execute("123");

  expect(user.name).toBe("John");
});

// TypeScript Mock 라이브러리 활용
import { mock, instance, when } from "ts-mockito";

it("should get user with ts-mockito", async () => {
  const mockRepo = mock<UserRepository>();
  when(mockRepo.getUser("123")).thenResolve({
    id: "123",
    name: "John"
  });

  const useCase = new GetUserUseCase(instance(mockRepo));
  const user = await useCase.execute("123");

  expect(user.name).toBe("John");
});
```

**장점:**
- 성숙한 모킹 라이브러리 생태계
- 타입 안전한 모킹
- 검증(verification) 기능 풍부

**단점:**
- Mock 설정 코드가 많아짐
- 과도한 모킹은 테스트 취약성 증가

#### 함수형 접근법
```typescript
// Fake Repository (추천)
const fakeUserRepository = (): UserRepository => {
  const users = new Map<string, User>();

  return {
    getUser: async (id) => {
      const user = users.get(id);
      if (!user) throw new Error("User not found");
      return user;
    },
    create: async (data) => {
      const user = { id: generateId(), ...data };
      users.set(user.id, user);
      return user;
    }
  };
};

it("should get user with fake", async () => {
  const repo = fakeUserRepository();
  await repo.create({ name: "John", email: "john@example.com" });

  const getUser = makeGetUser(repo);
  const user = await getUser("generated-id");

  expect(user.name).toBe("John");
});

// Test Double with Partial Mock
it("should get user with partial mock", async () => {
  const testRepo: Partial<UserRepository> = {
    getUser: async (id) => ({ id, name: "John", email: "john@example.com" })
  };

  const getUser = makeGetUser(testRepo as UserRepository);
  const user = await getUser("123");

  expect(user.name).toBe("John");
});

// Effect Layer로 테스트
const TestUserRepositoryLive = Layer.succeed(UserRepository, {
  getUser: (id) => Effect.succeed({ id, name: "Test User" }),
  create: (data) => Effect.succeed({ id: "test-id", ...data })
});

it("should get user with Effect", async () => {
  const program = Effect.gen(function* (_) {
    const getUser = yield* _(makeGetUser);
    return yield* _(getUser("123"));
  });

  const result = await Effect.runPromise(
    program.pipe(Effect.provide(TestUserRepositoryLive))
  );

  expect(result.name).toBe("Test User");
});
```

**장점:**
- Fake 객체가 실제 구현과 유사해 더 현실적인 테스트
- 테스트 코드가 간결
- Mock 설정 보일러플레이트 감소

**단점:**
- Fake 구현 유지보수 필요
- 복잡한 상호작용 검증은 어려움

**출처:**
- [Testing Modules in Clean Architecture - Use Cases](https://medium.com/huawei-developers/testing-the-modules-of-your-mvvm-clean-architecture-android-project-part-2-testing-the-use-d2b5ddf5380a)

---

### 3.3 코드 재사용성

#### 클래스 기반 접근법
```typescript
// 상속으로 재사용
abstract class CrudUseCase<TEntity, TCreateDTO, TUpdateDTO> {
  constructor(protected repository: Repository<TEntity>) {}

  async getById(id: string): Promise<TEntity> {
    return this.repository.findById(id);
  }

  async create(data: TCreateDTO): Promise<TEntity> {
    return this.repository.create(data);
  }

  async update(id: string, data: TUpdateDTO): Promise<TEntity> {
    return this.repository.update(id, data);
  }

  abstract validate(data: TCreateDTO | TUpdateDTO): Promise<void>;
}

// 구체 클래스
class UserCrudUseCase extends CrudUseCase<User, CreateUserDTO, UpdateUserDTO> {
  async validate(data: CreateUserDTO | UpdateUserDTO): Promise<void> {
    if (!data.email) throw new Error("Email required");
  }
}
```

**장점:**
- 템플릿 메서드 패턴으로 공통 로직 재사용
- 명확한 계층 구조

**단점:**
- 깊은 상속 계층
- 단일 상속 제약

#### 함수형 접근법
```typescript
// 고차 함수로 재사용
const makeCrudUseCases = <TEntity, TCreateDTO, TUpdateDTO>(
  repository: Repository<TEntity>,
  validator: (data: TCreateDTO | TUpdateDTO) => Promise<void>
) => {
  const getById = async (id: string) => {
    return repository.findById(id);
  };

  const create = async (data: TCreateDTO) => {
    await validator(data);
    return repository.create(data);
  };

  const update = async (id: string, data: TUpdateDTO) => {
    await validator(data);
    return repository.update(id, data);
  };

  return { getById, create, update };
};

// 사용
const userCrud = makeCrudUseCases(
  userRepository,
  async (data) => {
    if (!data.email) throw new Error("Email required");
  }
);

// 더 유연한 합성
const withValidation = <T>(
  fn: (data: T) => Promise<any>,
  validator: (data: T) => Promise<void>
) => {
  return async (data: T) => {
    await validator(data);
    return fn(data);
  };
};

const createUser = withValidation(
  (data: CreateUserDTO) => userRepository.create(data),
  async (data) => {
    if (!data.email) throw new Error("Email required");
  }
);
```

**장점:**
- 다중 합성 가능 (상속 제약 없음)
- 믹스인(mixin) 패턴 자연스러움
- 런타임 조합 자유로움

**단점:**
- 타입 추론 복잡도
- 네이밍 충돌 가능성

---

### 3.4 보일러플레이트 코드량

#### 클래스 기반 접근법
```typescript
// 각 UseCase마다 클래스 선언 필요
class GetUserUseCase {
  constructor(private userRepository: UserRepository) {}
  async execute(id: string): Promise<User> {
    return this.userRepository.getUser(id);
  }
}

class GetUsersUseCase {
  constructor(private userRepository: UserRepository) {}
  async execute(): Promise<User[]> {
    return this.userRepository.getUsers();
  }
}

class CreateUserUseCase {
  constructor(private userRepository: UserRepository) {}
  async execute(data: CreateUserDTO): Promise<User> {
    return this.userRepository.create(data);
  }
}

// 총 라인 수: ~30줄 (3개 UseCase)
```

#### 함수형 접근법
```typescript
// 함수로 간결하게 표현
const makeGetUser = (repo: UserRepository) =>
  (id: string) => repo.getUser(id);

const makeGetUsers = (repo: UserRepository) =>
  () => repo.getUsers();

const makeCreateUser = (repo: UserRepository) =>
  (data: CreateUserDTO) => repo.create(data);

// 총 라인 수: ~6줄 (3개 UseCase)

// 또는 한 번에 export
const makeUserUseCases = (repo: UserRepository) => ({
  getUser: (id: string) => repo.getUser(id),
  getUsers: () => repo.getUsers(),
  createUser: (data: CreateUserDTO) => repo.create(data)
});
```

**결과:**
- 클래스: ~30줄
- 함수형: ~6-10줄
- **약 3-5배 코드 감소**

**출처:**
- [Clean Architecture with Next.js](https://dev.to/dan1618/clean-architecture-with-nextjs-43cg)

---

## 4. 현대적 트렌드

### 4.1 React Hooks와의 호환성

#### 클래스 기반 접근법
```typescript
// UseCase 클래스
class GetUserUseCase {
  constructor(private userRepository: UserRepository) {}
  async execute(id: string): Promise<User> {
    return this.userRepository.getUser(id);
  }
}

// React Hook에서 사용
const useUser = (id: string) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const useCase = new GetUserUseCase(userRepository);
    setLoading(true);
    useCase.execute(id)
      .then(setUser)
      .finally(() => setLoading(false));
  }, [id]);

  return { user, loading };
};

// ❌ 문제: 매 렌더링마다 새 인스턴스 생성
// ✅ 개선: useMemo 사용
const useUser = (id: string) => {
  const useCase = useMemo(
    () => new GetUserUseCase(userRepository),
    []
  );

  // React Query와 함께
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => useCase.execute(id)
  });
};
```

**단점:**
- 클래스 인스턴스 관리 복잡
- Hooks 규칙과 충돌 가능

#### 함수형 접근법
```typescript
// UseCase 함수
const makeGetUser = (repo: UserRepository) =>
  (id: string) => repo.getUser(id);

const getUser = makeGetUser(userRepository);

// React Hook에서 사용
const useUser = (id: string) => {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => getUser(id) // 직접 사용
  });
};

// 또는 Custom Hook으로
const useUser = (id: string) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getUser(id)
      .then(setUser)
      .finally(() => setLoading(false));
  }, [id]);

  return { user, loading };
};

// DI with React Context
const UserRepositoryContext = createContext<UserRepository | null>(null);

const useUserRepository = () => {
  const repo = useContext(UserRepositoryContext);
  if (!repo) throw new Error("UserRepository not provided");
  return repo;
};

const useGetUser = () => {
  const repo = useUserRepository();
  return useMemo(() => makeGetUser(repo), [repo]);
};

// 사용
const UserProfile = ({ id }: { id: string }) => {
  const getUser = useGetUser();
  const { data: user } = useQuery({
    queryKey: ['user', id],
    queryFn: () => getUser(id)
  });

  return <div>{user?.name}</div>;
};
```

**장점:**
- Hooks와 자연스러운 통합
- 함수 조합으로 Custom Hooks 쉽게 구성
- Context API로 DI 간단히 구현

**출처:**
- [Clean Architecture: React and TypeScript](https://github.com/bespoyasov/frontend-clean-architecture)
- [React Clean Architecture](https://github.com/eduardomoroni/react-clean-architecture)

---

### 4.2 Next.js Server Actions

#### 클래스 기반 접근법
```typescript
// UseCase 클래스
class CreateUserUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute(data: CreateUserDTO): Promise<User> {
    return this.userRepository.create(data);
  }
}

// Server Action
"use server";

export async function createUserAction(formData: FormData) {
  const data = {
    name: formData.get("name") as string,
    email: formData.get("email") as string
  };

  const useCase = new CreateUserUseCase(userRepository);
  const user = await useCase.execute(data);

  revalidatePath("/users");
  return { success: true, user };
}

// Client Component
const UserForm = () => {
  return (
    <form action={createUserAction}>
      <input name="name" />
      <input name="email" />
      <button type="submit">Create</button>
    </form>
  );
};
```

**문제점:**
- Server Action 내부에서 클래스 인스턴스 생성
- 매 요청마다 새 인스턴스 생성 (성능 이슈)
- DI 컨테이너와 통합 복잡

#### 함수형 접근법
```typescript
// UseCase 함수
const makeCreateUser = (repo: UserRepository) =>
  (data: CreateUserDTO) => repo.create(data);

// Server Action - 함수 직접 사용
"use server";

const createUser = makeCreateUser(userRepository);

export async function createUserAction(formData: FormData) {
  const data = {
    name: formData.get("name") as string,
    email: formData.get("email") as string
  };

  const user = await createUser(data); // 함수 직접 호출

  revalidatePath("/users");
  return { success: true, user };
}

// 또는 Server Action 자체를 UseCase로
"use server";

export const createUser = makeCreateUser(userRepository);

// Client Component
const UserForm = () => {
  const [state, formAction] = useFormState(createUser, null);

  return (
    <form action={formAction}>
      <input name="name" />
      <input name="email" />
      <button type="submit">Create</button>
    </form>
  );
};

// Next.js 15 - useActionState
const UserForm = () => {
  const [state, dispatch, isPending] = useActionState(createUser, null);

  return (
    <form action={dispatch}>
      <input name="name" disabled={isPending} />
      <input name="email" disabled={isPending} />
      <button type="submit" disabled={isPending}>
        {isPending ? "Creating..." : "Create"}
      </button>
    </form>
  );
};
```

**장점:**
- Server Actions와 완벽한 호환
- 함수 참조로 직접 전달 가능
- 상태 관리 간소화 (useFormState, useActionState)
- 스트리밍 및 Progressive Enhancement 지원

**출처:**
- [Clean Architecture with Next.js](https://github.com/nikolovlazar/nextjs-clean-architecture)
- [Production-Proven Clean Architecture in Next.js](https://dev.to/behnamrhp/stop-spaghetti-code-how-clean-architecture-saves-nextjs-projects-4l18)
- [Modern Full Stack Application Architecture Using Next.js 15+](https://softwaremill.com/modern-full-stack-application-architecture-using-next-js-15/)

---

### 4.3 함수형 라이브러리 (fp-ts, Effect)

#### fp-ts 접근법
```typescript
import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import * as E from "fp-ts/Either";

// Error Types
type DatabaseError = { _tag: "DatabaseError"; message: string };
type ValidationError = { _tag: "ValidationError"; message: string };
type UserError = DatabaseError | ValidationError;

// UseCase with fp-ts
const makeGetUser = (repo: UserRepository) => {
  return (id: string): TE.TaskEither<UserError, User> => {
    return pipe(
      TE.tryCatch(
        () => repo.getUser(id),
        (error): DatabaseError => ({
          _tag: "DatabaseError",
          message: String(error)
        })
      )
    );
  };
};

const makeCreateUser = (repo: UserRepository) => {
  return (data: CreateUserDTO): TE.TaskEither<UserError, User> => {
    return pipe(
      // Validation
      data.email.includes("@")
        ? E.right(data)
        : E.left<UserError>({
            _tag: "ValidationError",
            message: "Invalid email"
          }),
      TE.fromEither,
      // Create user
      TE.chain((validData) =>
        TE.tryCatch(
          () => repo.create(validData),
          (error): DatabaseError => ({
            _tag: "DatabaseError",
            message: String(error)
          })
        )
      )
    );
  };
};

// 사용
const program = pipe(
  makeCreateUser(repo)({ name: "John", email: "john@example.com" }),
  TE.fold(
    (error) => TE.of({ success: false, error: error.message }),
    (user) => TE.of({ success: true, user })
  )
);

await program();
```

#### Effect 접근법 (현대적 추천)
```typescript
import { Effect, pipe, Layer, Context } from "effect";

// Error Classes
class DatabaseError extends Error {
  readonly _tag = "DatabaseError";
}

class ValidationError extends Error {
  readonly _tag = "ValidationError";
}

// Service Definition
class UserRepository extends Context.Tag("UserRepository")<
  UserRepository,
  {
    getUser: (id: string) => Effect.Effect<User, DatabaseError>;
    create: (data: CreateUserDTO) => Effect.Effect<User, DatabaseError>;
  }
>() {}

// UseCase with Effect
const makeGetUser = Effect.gen(function* (_) {
  const repo = yield* _(UserRepository);

  return (id: string) =>
    pipe(
      repo.getUser(id),
      Effect.tap(() => Effect.log(`Getting user ${id}`)),
      Effect.retry({ times: 3 }),
      Effect.timeout("5 seconds")
    );
});

const makeCreateUser = Effect.gen(function* (_) {
  const repo = yield* _(UserRepository);

  return (data: CreateUserDTO) =>
    pipe(
      // Validation
      Effect.succeed(data),
      Effect.filterOrFail(
        (d) => d.email.includes("@"),
        () => new ValidationError("Invalid email")
      ),
      // Create user
      Effect.flatMap((validData) => repo.create(validData)),
      Effect.tap((user) => Effect.log(`Created user ${user.id}`))
    );
});

// Layer Implementation
const UserRepositoryLive = Layer.succeed(UserRepository, {
  getUser: (id) =>
    Effect.tryPromise({
      try: () => db.query("SELECT * FROM users WHERE id = $1", [id]),
      catch: (error) => new DatabaseError(String(error))
    }),
  create: (data) =>
    Effect.tryPromise({
      try: () => db.query("INSERT INTO users ...", [data]),
      catch: (error) => new DatabaseError(String(error))
    })
});

// 실행
const program = Effect.gen(function* (_) {
  const createUser = yield* _(makeCreateUser);
  return yield* _(createUser({ name: "John", email: "john@example.com" }));
});

const result = await Effect.runPromise(
  program.pipe(Effect.provide(UserRepositoryLive))
);
```

**Effect의 강력한 기능:**
1. **컴파일 타임 DI** - 의존성 누락 시 컴파일 에러
2. **타입 안전한 에러 핸들링** - 모든 에러가 타입에 표현
3. **자동 리소스 관리** - Scope로 cleanup 자동화
4. **구조적 동시성** - fiber 기반 병렬 처리
5. **Tracing & Metrics** - 내장 관찰성(observability)

**fp-ts vs Effect 비교:**
- **fp-ts**: 순수 FP 라이브러리, 학습 곡선 가파름
- **Effect**: "fp-ts v3" 격, 실용성과 성능 강화, 프로덕션 준비 완료

**출처:**
- [Why use Effect? 5 compelling reasons](https://tobyhobson.com/posts/effect/why-effect/)
- [fp-ts and Effect-TS Merger](https://github.com/gcanti/fp-ts)

---

## 5. 종합 평가 및 권장사항

### 5.1 비교 매트릭스

| 기준 | 클래스 기반 | 함수형 | 승자 |
|------|------------|--------|------|
| **SOLID 원칙** |
| SRP | ⭐⭐⭐⭐ (명확한 경계) | ⭐⭐⭐ (proxy 문제 없음) | 클래스 |
| OCP | ⭐⭐⭐ (상속) | ⭐⭐⭐⭐⭐ (합성) | 함수형 |
| DIP | ⭐⭐⭐⭐⭐ (인터페이스) | ⭐⭐⭐⭐ (고차 함수) | 클래스 |
| **함수형 원칙** |
| 순수 함수 | ⭐⭐⭐ (규칙 의존) | ⭐⭐⭐⭐⭐ (기본값) | 함수형 |
| 불변성 | ⭐⭐⭐ (readonly) | ⭐⭐⭐⭐⭐ (구조적) | 함수형 |
| 합성성 | ⭐⭐⭐ (데코레이터) | ⭐⭐⭐⭐⭐ (pipe/compose) | 함수형 |
| **실용성** |
| 테스트 용이성 | ⭐⭐⭐ (Builder 필요) | ⭐⭐⭐⭐ (부분 적용) | 함수형 |
| 모킹 | ⭐⭐⭐⭐⭐ (성숙한 도구) | ⭐⭐⭐⭐ (Fake 권장) | 클래스 |
| 재사용성 | ⭐⭐⭐ (상속 제약) | ⭐⭐⭐⭐⭐ (자유로운 합성) | 함수형 |
| 보일러플레이트 | ⭐⭐ (많음) | ⭐⭐⭐⭐⭐ (적음) | 함수형 |
| **현대 트렌드** |
| React Hooks | ⭐⭐⭐ (useMemo 필요) | ⭐⭐⭐⭐⭐ (자연스러움) | 함수형 |
| Next.js Actions | ⭐⭐⭐ (인스턴스 관리) | ⭐⭐⭐⭐⭐ (완벽 호환) | 함수형 |
| fp-ts/Effect | ⭐⭐ (클래스와 충돌) | ⭐⭐⭐⭐⭐ (완벽 통합) | 함수형 |

### 5.2 시나리오별 권장사항

#### 시나리오 1: 엔터프라이즈 대규모 프로젝트
**권장: 클래스 기반 + Effect Layer DI**

```typescript
// 클래스로 UseCase 정의 (명확한 계약)
interface IGetUserUseCase {
  execute(id: string): Effect.Effect<User, UserError, UserRepository>;
}

class GetUserUseCase implements IGetUserUseCase {
  execute(id: string) {
    return Effect.gen(function* (_) {
      const repo = yield* _(UserRepository);
      return yield* _(repo.getUser(id));
    });
  }
}

// Layer로 DI
const GetUserUseCaseLive = Layer.succeed(
  IGetUserUseCase,
  new GetUserUseCase()
);
```

**이유:**
- 대규모 팀에서 명시적 계약 중요
- DI 컨테이너와 통합 용이
- 팀원 온보딩 쉬움 (OOP 익숙함)

---

#### 시나리오 2: 스타트업 / 빠른 개발
**권장: 함수형 접근법**

```typescript
// 간결한 함수형
const makeUserUseCases = (repo: UserRepository) => ({
  getUser: (id: string) => repo.getUser(id),
  createUser: (data: CreateUserDTO) => repo.create(data),
  updateUser: (id: string, data: UpdateUserDTO) => repo.update(id, data)
});

export const userUseCases = makeUserUseCases(userRepository);
```

**이유:**
- 빠른 프로토타이핑
- 보일러플레이트 최소화
- 변경에 유연함

---

#### 시나리오 3: Next.js 15 + React 19 프로젝트
**권장: 함수형 + Server Actions**

```typescript
"use server";

// UseCase를 Server Action으로 직접 export
export const getUserAction = makeGetUser(userRepository);
export const createUserAction = makeCreateUser(userRepository);

// Client Component
const UserProfile = ({ id }: { id: string }) => {
  const [state, dispatch, isPending] = useActionState(getUserAction, null);

  useEffect(() => {
    dispatch(id);
  }, [id, dispatch]);

  if (isPending) return <Spinner />;
  return <div>{state?.name}</div>;
};
```

**이유:**
- Server Actions와 완벽 호환
- React 19 useActionState 최적화
- 클라이언트/서버 코드 공유 간편

---

#### 시나리오 4: 복잡한 비즈니스 로직
**권장: Effect 기반 함수형**

```typescript
import { Effect, pipe } from "effect";

const makeTransferMoney = Effect.gen(function* (_) {
  const accountRepo = yield* _(AccountRepository);
  const transactionRepo = yield* _(TransactionRepository);
  const emailService = yield* _(EmailService);

  return (from: string, to: string, amount: number) =>
    pipe(
      // 병렬로 계좌 조회
      Effect.all([
        accountRepo.getAccount(from),
        accountRepo.getAccount(to)
      ]),
      // 잔액 검증
      Effect.filterOrFail(
        ([fromAcc, _]) => fromAcc.balance >= amount,
        () => new InsufficientFundsError()
      ),
      // 트랜잭션 생성 (atomic)
      Effect.flatMap(([fromAcc, toAcc]) =>
        Effect.all([
          accountRepo.updateBalance(from, fromAcc.balance - amount),
          accountRepo.updateBalance(to, toAcc.balance + amount),
          transactionRepo.create({ from, to, amount })
        ], { concurrency: "unbounded" })
      ),
      // 이메일 전송 (실패해도 rollback 안 함)
      Effect.tap(() =>
        emailService.sendTransferNotification(from, to, amount)
          .pipe(Effect.catchAll(() => Effect.succeed(undefined)))
      ),
      // 재시도 및 타임아웃
      Effect.retry({ schedule: Schedule.exponential("100 millis") }),
      Effect.timeout("30 seconds")
    );
});
```

**이유:**
- 복잡한 에러 핸들링 타입 안전
- 병렬 처리, 재시도, 타임아웃 내장
- Observability 내장 (tracing)

---

### 5.3 하이브리드 접근법 (Best of Both Worlds)

많은 프로덕션 프로젝트는 **하이브리드** 접근을 사용합니다.

```typescript
// 1. 인터페이스로 계약 정의 (OOP)
interface ICreateUserUseCase {
  execute(data: CreateUserDTO): Effect.Effect<User, UserError, Dependencies>;
}

// 2. 함수형으로 구현
const makeCreateUserUseCase = (): ICreateUserUseCase => ({
  execute: (data) =>
    Effect.gen(function* (_) {
      const repo = yield* _(UserRepository);
      const email = yield* _(EmailService);

      // 함수형 파이프라인
      return yield* _(
        pipe(
          validateUserData(data),
          Effect.flatMap((validData) => repo.create(validData)),
          Effect.tap((user) => email.sendWelcome(user.email))
        )
      );
    })
});

// 3. Layer로 제공
const CreateUserUseCaseLive = Layer.succeed(
  ICreateUserUseCase,
  makeCreateUserUseCase()
);
```

**장점:**
- 인터페이스로 명시적 계약 (팀 협업)
- 함수형 파이프라인으로 로직 표현
- Effect Layer로 컴파일 타임 DI
- 테스트 시 Mock/Fake 자유롭게 선택

---

### 5.4 최종 권장사항

#### 🏆 **2024-2025년 권장 접근법**

**중소형 프로젝트 (<10만 라인):**
```typescript
✅ 함수형 접근법 + Effect-TS
- 빠른 개발, 적은 보일러플레이트
- Next.js Server Actions와 완벽 호환
- 타입 안전한 에러 핸들링
```

**대규모 엔터프라이즈 (>10만 라인):**
```typescript
✅ 하이브리드: 인터페이스 + 함수형 구현 + Effect Layer DI
- 명시적 계약으로 팀 협업
- 함수형 파이프라인으로 로직 표현
- 컴파일 타임 의존성 검증
```

**레거시 코드베이스:**
```typescript
✅ 클래스 기반 (기존 유지)
- 팀의 OOP 전문성 활용
- 점진적 함수형 도입 (새 기능부터)
- DI 컨테이너 활용
```

#### 📚 학습 로드맵

1. **기초**: 함수형 접근법으로 시작
   - 클래스보다 배우기 쉬움
   - 보일러플레이트 적어 빠른 피드백

2. **중급**: Effect-TS 도입
   - 타입 안전한 에러 핸들링
   - 컴파일 타임 DI

3. **고급**: 하이브리드 패턴
   - 프로젝트 규모에 따라 조합
   - DDD와 함께 사용

#### 🎯 핵심 메시지

> **"클래스냐 함수냐"보다 중요한 것:**
> 1. **일관성** - 팀이 선택한 패턴을 일관되게 적용
> 2. **테스트 가능성** - 어떤 방식이든 테스트하기 쉬워야 함
> 3. **비즈니스 로직 분리** - 프레임워크로부터 독립성 유지
> 4. **팀의 전문성** - 팀이 잘 아는 방식 선택

---

## Sources

### SOLID Principles
- [Breaking SOLID principles and Clean Architecture Discussion](https://github.com/android/nowinandroid/discussions/1273)
- [Transforming UseCase: Embracing Fluent and Functional Approach](https://proandroiddev.com/transforming-usecase-embracing-fluent-and-functional-approach-2023-eba69d2117d6)
- [Building Your First Use Case With Clean Architecture](https://www.milanjovanovic.tech/blog/building-your-first-use-case-with-clean-architecture)
- [A Deep Dive into Clean Architecture and SOLID Principles](https://medium.com/@unaware_harry/a-deep-dive-into-clean-architecture-and-solid-principles-dcdcec5db48a)

### Functional Programming & React
- [React + TypeScript Clean Architecture](https://github.com/bespoyasov/frontend-clean-architecture)
- [The Clean Architecture using React and TypeScript](https://medium.com/@rostislavdugin/the-clean-architecture-using-react-and-typescript-a832662af803)
- [Clean Architecture: React and Typescript](https://dev.to/paulallies/clean-architecture-react-and-typescript-2i36)
- [React Clean Architecture](https://github.com/eduardomoroni/react-clean-architecture)

### Next.js Integration
- [Clean Architecture with Next.js](https://github.com/nikolovlazar/nextjs-clean-architecture)
- [Production-Proven Clean Architecture in Next.js](https://dev.to/behnamrhp/stop-spaghetti-code-how-clean-architecture-saves-nextjs-projects-4l18)
- [Modern Full Stack Application Architecture Using Next.js 15+](https://softwaremill.com/modern-full-stack-application-architecture-using-next-js-15/)
- [Clean Architecture Layering in Next.js with DI](https://dev.to/behnamrhp/how-we-fixed-nextjs-at-scale-di-clean-architecture-secrets-from-production-gnj)

### Effect-TS & fp-ts
- [Why use Effect? 5 compelling reasons](https://tobyhobson.com/posts/effect/why-effect/)
- [fp-ts GitHub](https://github.com/gcanti/fp-ts)
- [Functional Dependency Injection in TypeScript](https://hassannteifeh.medium.com/functional-dependency-injection-in-typescript-4c2739326f57)
- [Dependency Injection in Functional Programming](https://dev.to/psfeng/dependency-injection-in-functional-programming-3gg4)
- [Functional approaches to dependency injection](https://fsharpforfunandprofit.com/posts/dependency-injection-1/)

### Testing
- [Unit Testing Clean Architecture Use Cases](https://www.milanjovanovic.tech/blog/unit-testing-clean-architecture-use-cases)
- [Clean Architecture UseCase Tests](https://www.entropywins.wtf/blog/2018/08/01/clean-architecture-usecase-tests/)
- [Testing Modules in Clean Architecture - Use Cases](https://medium.com/huawei-developers/testing-the-modules-of-your-mvvm-clean-architecture-android-project-part-2-testing-the-use-d2b5ddf5380a)
- [Clean Architecture: Implementing testing patterns](https://www.roccolangeweg.com/clean-architecture-implementing-testing-patterns/)

---

## 결론

Clean Architecture의 UseCase 레이어에서 **클래스 기반**과 **함수형** 접근법은 각각 장단점이 있습니다:

### 클래스 기반이 유리한 경우:
- ✅ 대규모 엔터프라이즈 프로젝트
- ✅ 명시적 계약이 중요한 팀
- ✅ OOP에 익숙한 개발팀
- ✅ 복잡한 DI 컨테이너 사용

### 함수형이 유리한 경우:
- ✅ Next.js + React 현대적 스택
- ✅ 빠른 개발 속도 중요
- ✅ 보일러플레이트 최소화
- ✅ Effect-TS/fp-ts 사용

### 2025년 트렌드:
**함수형 접근법 + Effect-TS**가 주류로 자리잡고 있으며, 특히 Next.js 15, React 19와의 통합에서 큰 이점을 보입니다.

그러나 **하이브리드 접근법** (인터페이스 + 함수형 구현)이 대규모 프로젝트에서 가장 실용적인 선택입니다.
