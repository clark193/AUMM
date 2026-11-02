# Edição de dados do associado

`POST /admin/member-profile` recebe um token do Firebase Authentication, o `memberId`, a versão `expectedVersion` (milissegundos de `updatedAt`, ou `null` para cadastros antigos) e `updates` com os dados pessoais.

O servidor verifica a sessão revogada, o cargo ativo de nível 1 e o vínculo ativo de associado. A mudança de e-mail de login exige autenticação nos últimos cinco minutos. O formulário confirma a senha do administrador quando o e-mail muda. Datas de criação, UID, número, cargos e permissões não são aceitos nesse formulário; os controles de cargo, situação e voto permanecem nos recursos existentes.

O serviço valida CPF, nascimento, contato e categoria, confere duplicidades, serializa edições concorrentes por cadastro e rejeita uma versão desatualizada. Sincroniza o e-mail e o nome no Authentication, os nomes das credenciais e o perfil administrativo vinculado. Se o commit do Firestore falhar, restaura o login anterior. A auditoria registra os nomes dos campos, sem seus valores pessoais.

## Publicação

Publique primeiro a versão do servidor no serviço **aumm-notificacoes** do Render, usando **Manual Deploy → Deploy latest commit** se a publicação automática estiver desativada. Confirme que `/health` responde `200` e que `X-AUMM-Revision` contém o commit publicado. Uma chamada POST sem autenticação a `/admin/member-profile` deve retornar `401` (e não `404`). Depois publique o export estático do site.

O editor do site depende desse endpoint para que o e-mail cadastrado continue igual ao e-mail de login.

## Teste local

Com Java 21 e os emuladores de Authentication e Firestore nas portas 9099 e 8080:

```sh
npm --prefix APP-Mobile/backend ci
npm --prefix APP-Mobile/backend run test:profile
```

O teste usa exclusivamente o projeto local `demo-aumm-profile`, limpa seus dados locais antes de executar e cobre autorização, validação, duplicidades, concorrência, restauração do login, e-mail de acesso real no emulador, credenciais, datas automáticas, registros pendentes e auditoria. Nunca execute esse teste com dados que queira preservar nos emuladores desse projeto.
