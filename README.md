# k3s backed to NATS JetStream

## Prerequisites

- Recent version of [docker](https://docs.docker.com/engine/install/) with [docker compose plugin](https://docs.docker.com/compose/install/)
- `k3d` binary - [install instructions](https://k3d.io)
- If `sysctl fs.inotify.max_user_instances` is set to less than `256`, you may need to increase it by running `sudo sysctl fs.inotify.max_user_instances=256`

## Instructions

1. Create `nats` server in US - Chicago:

```bash
# create docker network for US
docker network create nats-us

# create aliases
alias docker_compose_us_chicago="docker compose -f nats-us-chicago/docker-compose.yaml"
alias nats_us_chicago="docker_compose_us_chicago exec nats-box nats"

# start nats in Chicago
docker_compose_us_chicago up -d

# check logs
docker_compose_us_chicago logs

# check that we can connect to NATS in Chicago
nats_us_chicago account info
```

2. Create `k3s` clusters in US - Chicago, NYC, and LA:

```bash
for location in chicago la nyc; do
    # create cluster
    K3D_FIX_DNS=1 k3d cluster create --config "k3s-us-$location/cluster.yaml"

    # validate JetStream kv bucket
    nats_us_chicago kv list --js-api-prefix="JS.us.$location"

    # wait for CoreDNS to be ready
    sleep 20
    kubectl wait -n kube-system --for=condition=ready pod -l k8s-app=kube-dns --timeout=60s

    # list all cluster resources
    kubectl get -A all

    # deploy app
    kubectl apply -f "k3s-us-$location/deploy.yaml"

    # wait for app to be ready
    sleep 5
    kubectl wait --for=condition=ready pod -l app=nats-app --timeout=60s

    # verify app
    sleep 5
    kubectl logs deploy/nats-app
done
```

3. Extend into the Cloud

Sign up for NGS at https://app.ngs.global

```bash
# download nsc tool and import your account from NGS
curl -fSs https://get-nats.io/install.sh | SECRET="<secret>" sh

# copy creds to Chicago
nsc generate creds -n default > nats-us-chicago/extension-cloud.creds

# update docker-compose alias to nats with cloud extension
alias docker_compose_us_chicago="EXTENSION=cloud docker compose -f nats-us-chicago/docker-compose.yaml"

# recreate nats to use new configuration
docker_compose_us_chicago up -d

# check logs
docker_compose_us_chicago logs
```

4. Start the Web App

```bash
docker compose -f webapp/docker-compose.yaml up --build -d
```

- Navigate to http://localhost:3000
- Click "Login" and paste the credentials of the file `nats-us-chicago/extension-cloud.creds`

5. Mirror US Streams into NGS

```bash
for location in chicago la nyc; do
    # mirror stream
    nats stream create "KV_us-$location" --config "mirror/us-$location.json"
done

nats stream list -a
```

6. Backup Streams from NGS

```bash
rm -rf backup/
nats account backup -f backup/
```

In each of the `backup.json` files in `backup/<stream>/backup.json`, delete the JSON key `config.mirror.

7. Delete and Restore Streams in Chicago

```bash
# stop k3d clusters
k3d cluster stop us-chicago us-la us-nyc

# destroy NATS server and data in Chicago
docker_compose_us_chicago down -v

# recreate all NATS server in Chicago
docker_compose_us_chicago up -d

# copy backup files to Chicago
docker_compose_us_chicago cp backup nats-box:/tmp/backup

for location in chicago la nyc; do
    # restore the stream
    nats_us_chicago --server nats-1 --user "$location" --password "$location" stream restore "/tmp/backup/KV_us-$location"

    # add subject back to stream
    nats_us_chicago --server nats-1 --user "$location" --password "$location" stream edit -f --subjects "\$KV.us-$location.>" "KV_us-$location"

    # list kv buckets
    nats_us_chicago --server nats-1 --user "$location" --password "$location" kv list
done

# start k3d clusters
k3d cluster start us-chicago us-la us-nyc
```

## Bonus - EU

1. Create `nats` server in EU - Luxembourg:

```bash
# create docker network for EU
docker network create nats-eu

# create aliases
alias docker_compose_eu_luxembourg="docker compose -f nats-eu-luxembourg/docker-compose.yaml"
alias nats_eu_luxembourg="docker_compose_eu_luxembourg exec nats-box nats"

# start nats in Luxembourg
docker_compose_eu_luxembourg up -d

# check logs
docker_compose_eu_luxembourg logs

# check that we can connect to NATS in Luxembourg
nats_eu_luxembourg account info
```

2. Create `k3s` clusters in EU - Barcelona, Luxembourg, and Munich:

```bash
for location in barcelona luxembourg munich; do
    # create cluster
    K3D_FIX_DNS=1 k3d cluster create --config "k3s-eu-$location/cluster.yaml"

    # validate JetStream kv bucket
    nats_eu_luxembourg kv list --js-api-prefix="JS.eu.$location"

    # wait for CoreDNS to be ready
    sleep 20
    kubectl wait -n kube-system --for=condition=ready pod -l k8s-app=kube-dns --timeout=60s

    # list all cluster resources
    kubectl get -A all

    # deploy app
    kubectl apply -f "k3s-eu-$location/deploy.yaml"

    # wait for app to be ready
    sleep 5
    kubectl wait --for=condition=ready pod -l app=nats-app --timeout=60s

    # verify app
    sleep 5
    kubectl logs deploy/nats-app
done
```

3. Extend into the Cloud

```bash
# copy creds to Luxembourg
nsc generate creds -n default > nats-eu-luxembourg/extension-cloud.creds

# update docker-compose alias to nats with cloud extension
alias docker_compose_eu_luxembourg="EXTENSION=cloud docker compose -f nats-eu-luxembourg/docker-compose.yaml"

# recreate nats to use new configuration
docker_compose_eu_luxembourg up -d

# check logs
docker_compose_eu_luxembourg logs
```

4. Mirror EU Streams into NGS

```bash
for location in barcelona luxembourg munich; do
    # mirror stream
    nats stream create "KV_eu-$location" --config "mirror/eu-$location.json"
done

nats stream list -a
```

## Cleaning Up

### US

```bash
for location in chicago la nyc; do
    nats stream delete -f "KV_us-$location"
    k3d cluster delete "us-$location"
done
docker_compose_us_chicago down -v
docker network rm nats-us
```

### EU

```bash
for location in barcelona luxembourg munich; do
    nats stream delete -f "KV_eu-$location"
    k3d cluster delete "eu-$location"
done
docker_compose_eu_luxembourg down -v
docker network rm nats-eu
```
