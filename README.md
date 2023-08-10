# Bookinfo Application deployed to Kubernetes with ArgoCD and Istio

[Istio Documentation](https://istio.io/latest/docs/examples/bookinfo/)

---

## Istio Architecture

![Istio Service Mesh Architecture](https://istio.io/latest/docs/ops/deployment/architecture/arch.svg)

---

## About the Application

- This example deploys a sample application composed of four separate microservices used to demonstrate various Istio features.

The application displays information about a book, similar to a single catalog entry of an online book store. Displayed on the page is a description of the book, book details (ISBN, number of pages, and so on), and a few book reviews.

The Bookinfo application is broken into four separate microservices:

- **Productpage:** The productpage microservice calls the details and reviews microservices to populate the page.
- **details:** The details microservice contains book information.
- **reviews:** The reviews microservice contains book reviews. It also calls the ratings microservice.
- **ratings:** The ratings microservice contains book ranking information that accompanies a book review.

There are 3 versions of the reviews microservice:

1. Version v1 doesn’t call the ratings service.
2. Version v2 calls the ratings service, and displays each rating as 1 to 5 black stars.
3. Version v3 calls the ratings service, and displays each rating as 1 to 5 red stars.

### Application Architecture

![Application Architecture](https://istio.io/latest/docs/examples/bookinfo/withistio.svg)

This application is polyglot, i.e., the microservices are written in different languages. It’s worth noting that these services have no dependencies on Istio, but make an interesting service mesh example, particularly because of the multitude of services, languages and versions for the reviews service.

---

### Setup Local Kubernetes Environment (KinD) with LoadBalancer (Metallb)

Please refer to the following github repo for setting up a local kubernetes environment using KinD and LoadBalancer using Metallb.

[Create Multi-Node Local Kubernetes Cluster (KinD) with LoadBalancer (Metallb)](https://github.com/NaumanMunir9/Create-Multi-Node-Local-Kubernetes-Cluster--KinD--with-LoadBalancer--Metallb-)

---

## Project WorkFlow

### Installing ArgoCD

```shell
k create namespace argocd
k apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

```shell
k get all -n argocd
```

---

### Change the service type of "argocd-server" from "ClusterIP" to LoadBalancer

For the argocd to utilize Metallb, we have to change the service type of "argocd-server" service from "ClusterIP" to "LoadBalancer"

```shell
k edit service argocd-server -n argocd
```

```shell
k get all -n argocd
```

**Now we see that the service type of "argocd-server" service has been changed from "ClusterIP" to "LoadBalancer".**

---

### Login ArgoCD Web Interface

- ArgoCD UI admin **username**: *admin*
- ArgoCD UI admin **password**: *xxxxxxxxxxxx*

##### For retrieving ArgoCD UI admin password, paste the following command in the terminal:

```shell
k -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```

---

### Kubernetes Gateway API

Istio includes beta support for the Kubernetes Gateway API and intends to make it the default API for traffic management in the future.

Note that the Kubernetes Gateway API CRDs do not come installed by default on most Kubernetes clusters, so make sure they are installed before using the Gateway API:

```shell
k get crd gateways.gateway.networking.k8s.io &> /dev/null || \
  { k kustomize "github.com/kubernetes-sigs/gateway-api/config/crd?ref=v0.6.2" | k apply -f -; }
```

---

### Deploying the application

To run the sample with Istio requires no changes to the application itself. Instead, you simply need to configure and run the services in an Istio-enabled environment, with Envoy sidecars injected along side each service. The resulting deployment will look like this:

[Application with Istio](https://istio.io/latest/docs/examples/bookinfo/withistio.svg)

All of the microservices will be packaged with an Envoy sidecar that intercepts incoming and outgoing calls for the services, providing the hooks needed to externally control, via the Istio control plane, routing, telemetry collection, and policy enforcement for the application as a whole.

The default Istio installation uses automatic sidecar injection. Label the namespace that will host the application with istio-injection=enabled:

```shell
k label namespace default istio-injection=enabled
```

---

```shell
k get all
```

To confirm that the Bookinfo application is running, send a request to it by a curl command from some pod, for example from ratings:

```shell
k exec "$(k get pod -l app=ratings -o jsonpath='{.items[0].metadata.name}')" -c ratings -- curl -sS productpage:9080/productpage | grep -o "<title>.*</title>"
```

---

### Determine the ingress IP and port

Now that the Bookinfo services are up and running, you need to make the application accessible from outside of your Kubernetes cluster, e.g., from a browser. A gateway is used for this purpose.

#### Create a gateway for the Bookinfo application

These instructions assume that your Kubernetes cluster supports external load balancers (i.e., Services of type LoadBalancer).

Create a Kubernetes Gateway using the following command:

```shell
k apply -f https://raw.githubusercontent.com/istio/istio/master/samples/bookinfo/gateway-api/bookinfo-gateway.yaml
```

Because creating a Kubernetes Gateway resource will also deploy an associated proxy service, run the following command to wait for the gateway to be ready:

```shell
k wait --for=condition=programmed gtw bookinfo-gateway
```

Get the gateway address and port from the bookinfo gateway resource:

```shell
export INGRESS_HOST=$(k get gtw bookinfo-gateway -o jsonpath='{.status.addresses[0].value}')
export INGRESS_PORT=$(k get gtw bookinfo-gateway -o jsonpath='{.spec.listeners[?(@.name=="http")].port}')
```

#### Set GATEWAY_URL

```shell
export GATEWAY_URL=$INGRESS_HOST:$INGRESS_PORT
```

---

### Confirm the app is accessible from outside the cluster

To confirm that the Bookinfo application is accessible from outside the cluster, run the following curl command:

```shell
curl -s "http://${GATEWAY_URL}/productpage" | grep -o "<title>.*</title>"
```

You can also point your browser to http://$GATEWAY_URL/productpage to view the Bookinfo web page. If you refresh the page several times, you should see different versions of reviews shown in productpage, presented in a round robin style (red stars, black stars, no stars), since we haven’t yet used Istio to control the version routing.

---

### Define the service versions

Before you can use Istio to control the Bookinfo version routing, you need to define the available versions.

Unlike the Istio API, which uses DestinationRule subsets to define the versions of a service, the Kubernetes Gateway API uses backend service definitions for this purpose.

Run the following command to create backend service definitions for the three versions of the reviews service:

```shell
k apply -f samples/bookinfo/platform/kube/bookinfo-versions.yaml
```

---
