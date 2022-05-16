# k3s backed to NATS JetStream

1. Create `nats` server at distribution center:

```bash
# create aliases
alias docker_compose_nats_distctr="NATS_CONFIG=nats.single.conf docker compose -p nats-distctr -f nats-distctr/docker-compose.single.yaml"
alias nats_distctr="docker_compose_nats_distctr exec nats-box nats"

# start nats
docker_compose_nats_distctr up -d

# check logs
docker_compose_nats_distctr logs

# execute a nats cli command
nats_distctr account info
```

2. Create `k3s` cluster at store:

```bash
# create cluster
k3d cluster create --config k3s-store-1/cluster.yaml

# validate JetStream kv bucket
nats_distctr kv list

# list all cluster resources
kubectl get -A all
```

3. Create `k3s` cluster at distribution center:

```bash
# create cluster
k3d cluster create --config k3s-distctr/cluster.yaml

# validate JetStream kv bucket
nats_distctr kv list

# list all cluster resources
kubectl get -A all
```

4. Add HA servers and change stream replicas to 3

```bash
# stop k3d clusters
k3d cluster stop store-1 distctr

# stop nats
docker_compose_nats_distctr stop

# update alias
alias docker_compose_nats_distctr="NATS_CONFIG=nats.ha.conf docker compose -p nats-distctr -f nats-distctr/docker-compose.single.yaml -f nats-distctr/docker-compose.ha.yaml"

# start HA nats
docker_compose_nats_distctr up -d

# check logs
docker_compose_nats_distctr logs

# update stream replicas
nats_distctr stream list -a
nats_distctr stream edit KV_store-1-cluster --replicas=3 -f
nats_distctr stream edit KV_distctr-cluster --replicas=3 -f

# view stream info
nats_distctr stream info KV_store-1-cluster
nats_distctr stream info KV_distctr-cluster
```



## WIP below this line

Sign up for NGS at https://app.ngs.global

```bash
# download nsc tool and import your account from NGS
curl -fSs https://get-nats.io/install.sh | SECRET="<secret>" sh

# create user "distctr-ngs-extension"
nsc add user distctr-ngs-extension
nsc generate creds -n distctr-ngs-extension
```