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

### Intall Istioctl

```shell
brew install istioctl
```

---

### Getting Started

#### "Demo" configuration profile for Istio

For this application, we use the demo [configuration profile](https://istio.io/latest/docs/setup/additional-setup/config-profiles/). It’s selected to have a good set of defaults for testing, but there are other profiles for production or performance testing.

```shell
istioctl install --set profile=demo -y
```

---

### Deploying the application

To run the sample with Istio requires no changes to the application itself. Instead, you simply need to configure and run the services in an Istio-enabled environment, with Envoy sidecars injected along side each service. The resulting deployment will look like this:

[Application with Istio](https://istio.io/latest/docs/examples/bookinfo/withistio.svg)

All of the microservices will be packaged with an Envoy sidecar that intercepts incoming and outgoing calls for the services, providing the hooks needed to externally control, via the Istio control plane, routing, telemetry collection, and policy enforcement for the application as a whole.

The default Istio installation uses automatic sidecar injection. Label the namespace that will host the application with istio-injection=enabled.

Add a namespace label to instruct Istio to automatically inject Envoy sidecar proxies when you deploy your application later.

```shell
k label namespace default istio-injection=enabled
```

---

### Deploy the sample application

We will deploy our application in ArgoCD

```shell
k apply -f https://raw.githubusercontent.com/istio/istio/release-1.18/samples/bookinfo/platform/kube/bookinfo.yaml
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

### Open the application to outside traffic

The Bookinfo application is deployed but not accessible from the outside. To make it accessible, you need to create an Istio Ingress Gateway, which maps a path to a route at the edge of your mesh.

#### Associate this application with the Istio gateway:

```shell
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.18/samples/bookinfo/networking/bookinfo-gateway.yaml
```

#### Ensure that there are no issues with the configuration

```shell
istioctl analyze
```

---

### Determining the ingress IP and ports

#### Set the ingress host and ports

```shell
export INGRESS_HOST=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
export INGRESS_PORT=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.spec.ports[?(@.name=="http2")].port}')
export SECURE_INGRESS_PORT=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.spec.ports[?(@.name=="https")].port}')
```

#### Ensure an IP address and ports were successfully assigned to each environment variable

```shell
echo "$INGRESS_HOST"
```

```shell
echo "$INGRESS_PORT"
```

```shell
echo "$SECURE_INGRESS_PORT"
```

#### Set GATEWAY_URL

```shell
export GATEWAY_URL=$INGRESS_HOST:$INGRESS_PORT
```

#### Ensure an IP address and port were successfully assigned to the environment variable

```shell
echo "$GATEWAY_URL"
```

---

### Verify external access

Confirm that the Bookinfo application is accessible from outside by viewing the Bookinfo product page using a browser.

Run the following command to retrieve the external address of the Bookinfo application

```shell
echo "http://$GATEWAY_URL/productpage"
```

Paste the output from the previous command into your web browser and confirm that the Bookinfo product page is displayed.

---
